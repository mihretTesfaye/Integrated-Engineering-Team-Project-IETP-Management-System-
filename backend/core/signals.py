from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Project, ProjectGroup


@receiver(post_save, sender=ProjectGroup)
def create_project_stub_for_group(sender, instance, created, **kwargs):
    if not created:
        return
    Project.objects.get_or_create(
        group=instance,
        defaults={
            "title": f"Untitled Project - {instance.group_name}",
            "stage": Project.Stage.IDEA,
        },
    )