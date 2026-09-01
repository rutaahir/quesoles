import io
import pandas as pd
from datetime import datetime
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework import permissions, status
from rest_framework.response import Response
from django.utils import timezone

from branches.models import Branch
from queuing.models import Ticket
from analytics.models import ReportSnapshot

class ReportTrendsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        branch_id = request.query_params.get("branch")
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")
        
        # Super Admin sees all; Company Admin sees own company; Branch Admin + Desk Staff
        # are forced to their own branch ("View own desk" / "Full own branch" per Sheet 2)
        if user.role == "super_admin":
            snapshots = ReportSnapshot.objects.all()
        elif user.role in ["branch_admin", "desk_staff"]:
            if not user.branch_id:
                return Response({"error": "You must be assigned to a branch to view reports."}, status=status.HTTP_403_FORBIDDEN)
            branch_id = str(user.branch_id)
            snapshots = ReportSnapshot.objects.filter(company=user.company)
        else:
            # company_admin — own company, no branch forced
            snapshots = ReportSnapshot.objects.filter(company=user.company)

        if branch_id:
            snapshots = snapshots.filter(branch_id=branch_id)
            
        if start_date_str:
            snapshots = snapshots.filter(report_date__gte=start_date_str)
        if end_date_str:
            snapshots = snapshots.filter(report_date__lte=end_date_str)
            
        snapshots = snapshots.order_by("report_date")
        
        trends = []
        peak_hours = {}
        staff_summary = {}
        branch_comp = {}
        
        for snap in snapshots:
            metrics = snap.metrics
            report_date_str = snap.report_date.strftime("%Y-%m-%d")
            
            trends.append({
                "date": report_date_str,
                "total_tickets": metrics.get("total_tickets", 0),
                "served_count": metrics.get("served_count", 0),
                "avg_wait": metrics.get("avg_wait_minutes", 0),
                "avg_handle": metrics.get("avg_handle_minutes", 0),
            })
            
            for hour, val in metrics.get("peak_hours", {}).items():
                peak_hours[hour] = peak_hours.get(hour, 0) + val
                
            for op in metrics.get("staff_performance", []):
                op_id = op.get("operator_id")
                if op_id:
                    if op_id not in staff_summary:
                        staff_summary[op_id] = {
                            "name": op.get("operator_name", "Operator"),
                            "served_count": 0,
                            "avg_handle": []
                        }
                    staff_summary[op_id]["served_count"] += op.get("served_count", 0)
                    if op.get("avg_handle_minutes", 0) > 0:
                        staff_summary[op_id]["avg_handle"].append(op.get("avg_handle_minutes"))
            
            b_id = snap.branch.id
            if b_id not in branch_comp:
                branch_comp[b_id] = {
                    "name": snap.branch.name,
                    "total_tickets": 0,
                    "served_count": 0,
                    "avg_wait_sum": 0,
                    "avg_wait_cnt": 0,
                }
            branch_comp[b_id]["total_tickets"] += metrics.get("total_tickets", 0)
            branch_comp[b_id]["served_count"] += metrics.get("served_count", 0)
            branch_comp[b_id]["avg_wait_sum"] += metrics.get("avg_wait_minutes", 0)
            branch_comp[b_id]["avg_wait_cnt"] += 1
            
        staff_performance = []
        for op_id, data in staff_summary.items():
            avg_h = sum(data["avg_handle"]) / len(data["avg_handle"]) if data["avg_handle"] else 0
            staff_performance.append({
                "id": op_id,
                "name": data["name"],
                "served_count": data["served_count"],
                "avg_handle_minutes": avg_h
            })
            
        branch_comparison = []
        for b_id, data in branch_comp.items():
            avg_w = data["avg_wait_sum"] / data["avg_wait_cnt"] if data["avg_wait_cnt"] else 0
            branch_comparison.append({
                "id": b_id,
                "name": data["name"],
                "total_tickets": data["total_tickets"],
                "served_count": data["served_count"],
                "avg_wait_minutes": avg_w
            })
            
        return Response({
            "trends": trends,
            "peak_hours": [{"hour": h, "count": count} for h, count in sorted(peak_hours.items())],
            "staff_performance": staff_performance,
            "branch_comparison": branch_comparison
        }, status=status.HTTP_200_OK)


class ReportExportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def perform_content_negotiation(self, request, force=False):
        renderers = self.get_renderers()
        return (renderers[0], renderers[0].media_type)

    def get(self, request):
        user = request.user
        branch_id = request.query_params.get("branch")
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")
        export_format = request.query_params.get("format", "csv").lower()
        
        if user.role == "desk_staff":
            return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)


        company = user.company

        if user.role == "super_admin":
            snapshots = ReportSnapshot.objects.all()
        else:
            if user.role == "branch_admin":
                if not user.branch_id:
                    return Response({"error": "You must be assigned to a branch to view reports."}, status=status.HTTP_403_FORBIDDEN)
                branch_id = str(user.branch_id)
            snapshots = ReportSnapshot.objects.filter(company=user.company)

        if branch_id:
            snapshots = snapshots.filter(branch_id=branch_id)
            
        if start_date_str:
            snapshots = snapshots.filter(report_date__gte=start_date_str)
        if end_date_str:
            snapshots = snapshots.filter(report_date__lte=end_date_str)
            
        snapshots = snapshots.order_by("report_date")
        
        records = []
        for snap in snapshots:
            metrics = snap.metrics
            records.append({
                "Date": snap.report_date.strftime("%Y-%m-%d"),
                "Branch": snap.branch.name,
                "Total Tickets": metrics.get("total_tickets", 0),
                "Served Count": metrics.get("served_count", 0),
                "No Show Count": metrics.get("no_show_count", 0),
                "Avg Wait (Min)": round(metrics.get("avg_wait_minutes", 0), 2),
                "Avg Handle (Min)": round(metrics.get("avg_handle_minutes", 0), 2)
            })
            
        if not records:
            records.append({
                "Date": "N/A",
                "Branch": "N/A",
                "Total Tickets": 0,
                "Served Count": 0,
                "No Show Count": 0,
                "Avg Wait (Min)": 0,
                "Avg Handle (Min)": 0
            })
            
        df = pd.DataFrame(records)
        
        if export_format == "pdf":
            from reportlab.lib.pagesizes import letter
            from reportlab.lib import colors
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
            styles = getSampleStyleSheet()
            
            title_style = ParagraphStyle(
                'BrandedTitle',
                parent=styles['Heading1'],
                fontSize=24,
                textColor=colors.HexColor('#0F172A'),
                spaceAfter=15
            )
            
            normal_style = styles['Normal']
            
            elements = []
            elements.append(Paragraph("Quesols Analytics Report", title_style))
            elements.append(Paragraph(f"Company: {company.name} · Export Date: {timezone.now().strftime('%Y-%m-%d')}", normal_style))
            if branch_id:
                branch_obj = Branch.objects.filter(id=branch_id).first()
                if branch_obj:
                    elements.append(Paragraph(f"Filtered Branch: {branch_obj.name}", normal_style))
            elements.append(Spacer(1, 15))
            
            table_data = [[col for col in df.columns]]
            for index, row in df.iterrows():
                table_data.append([str(val) for val in row.values])
                
            table = Table(table_data, colWidths=[70, 110, 80, 80, 80, 80, 80])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,0), 10),
                ('BOTTOMPADDING', (0,0), (-1,0), 8),
                ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#F8FAFC')),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F1F5F9')]),
                ('FONTSIZE', (0,1), (-1,-1), 9),
            ]))
            
            elements.append(table)
            doc.build(elements)
            
            pdf_data = buffer.getvalue()
            buffer.close()
            
            response = HttpResponse(pdf_data, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="analytics_report_{timezone.now().strftime("%Y%m%d")}.pdf"'
            return response
            
        else:
            buffer = io.BytesIO()
            df.to_csv(buffer, index=False)
            csv_data = buffer.getvalue()
            buffer.close()
            
            response = HttpResponse(csv_data, content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="analytics_report_{timezone.now().strftime("%Y%m%d")}.csv"'
            return response
