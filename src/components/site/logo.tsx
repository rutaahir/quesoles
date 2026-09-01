import logoImage from "@/assets/Quesoles.png";

export function Logo({ size = 50 }: { size?: number }) {
  const targetHeight = size * 2.35;
  return (
    <img
      src={logoImage}
      alt="Quesols Logo"
      className="object-contain inline-block max-w-none"
      style={{ height: targetHeight, width: "auto" }}
    />
  );
}
