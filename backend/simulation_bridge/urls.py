from django.urls import path

from .views import catalog_view, preview_view

urlpatterns = [
    path('catalog/', catalog_view, name='simulation-catalog'),
    path('preview/', preview_view, name='simulation-preview'),
]
