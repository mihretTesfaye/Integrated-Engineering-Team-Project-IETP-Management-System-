from django.core.management.base import BaseCommand

from core.models import Project, ProjectGroup


class Command(BaseCommand):
    help = "Create a stub Project for any existing ProjectGroup that doesn't have one yet."

    def handle(self, *args, **options):
        groups_without_project = ProjectGroup.objects.filter(project__isnull=True)
        count = 0
        for group in groups_without_project:
            Project.objects.create(
                group=group,
                title=f"Untitled Project - {group.group_name}",
                stage=Project.Stage.IDEA,
            )
            count += 1
            self.stdout.write(f"Created project stub for group: {group.group_name}")

        if count == 0:
            self.stdout.write(self.style.SUCCESS("Nothing to backfill, every group already has a project."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Done. Created {count} project stub(s)."))