import contextvars
from contextlib import contextmanager
from django.utils.deprecation import MiddlewareMixin

_current_user = contextvars.ContextVar('current_user', default=None)

def get_current_user():
    return _current_user.get()

def set_current_user(user):
    return _current_user.set(user)

@contextmanager
def tenant_context(user):
    """
    Context manager to explicitly set the current user context for the duration
    of a code block, e.g. in Django Channels WebSocket consumers or Celery tasks.
    """
    token = _current_user.set(user)
    try:
        yield
    finally:
        _current_user.reset(token)

from django.http import JsonResponse

class ThreadLocalUserMiddleware(MiddlewareMixin):
    """
    Middleware that captures the requesting user from the HTTP request
    and stores it in thread-local storage (ContextVar) so ORM managers can read it.
    """
    def process_request(self, request):
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            set_current_user(user)
        else:
            set_current_user(None)



    def process_response(self, request, response):
        set_current_user(None)
        return response
