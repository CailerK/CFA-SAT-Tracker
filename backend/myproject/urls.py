"""URL configuration for myproject project."""

from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.http import HttpResponse


def react_index(request):
    """Serve the React build's index.html for any non-API, non-admin URL.

    In production, `python manage.py collectstatic` copies frontend/build/static
    into STATIC_ROOT, and the index.html template is found via TEMPLATES.DIRS.
    Hitting `/` (or `/login`, `/dashboard`, etc.) returns the SPA, which then
    handles its own routing client-side.
    """
    try:
        return TemplateView.as_view(template_name="index.html")(request)
    except Exception:
        return HttpResponse(
            "React build not found. Run `npm run build` in frontend/ "
            "and `python manage.py collectstatic` in backend/.",
            status=503,
        )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    # Catch-all: anything that's not /admin/ or /api/ falls through to React.
    re_path(r"^.*$", react_index, name="react_app"),
]
