import uuid

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models


# ---------------------------------------------------------------------------
# 2.1 USER
# ---------------------------------------------------------------------------

class UserManager(BaseUserManager):
    """Users log in with email, not username."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Maps to the USER table. All system users regardless of role.
    Uses email as the login identifier (matches schema: email UNIQUE, used for login).
    """

    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        ADVISOR = "advisor", "Advisor"
        ADMIN = "admin", "Admin"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=150)
    email = models.EmailField(max_length=255, unique=True)
    # password_hash is handled by AbstractBaseUser's `password` field (already hashed).
    role = models.CharField(max_length=20, choices=Role.choices)
    department = models.CharField(max_length=100, null=True, blank=True)
    is_active = models.BooleanField(default=True)  # soft-delete flag
    is_staff = models.BooleanField(default=False)  # required for Django admin access
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name", "role"]

    class Meta:
        db_table = "user"

    def __str__(self):
        return f"{self.full_name} ({self.role})"


# ---------------------------------------------------------------------------
# 2.2 PROJECT_GROUP
# ---------------------------------------------------------------------------

class ProjectGroup(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group_name = models.CharField(max_length=150)
    academic_year = models.CharField(max_length=20)  # e.g. "2025/2026"
    semester = models.CharField(max_length=20)  # e.g. "Semester 1"
    department_mix = models.TextField(null=True, blank=True)  # comma-separated
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="groups_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "project_group"

    def __str__(self):
        return self.group_name


# ---------------------------------------------------------------------------
# 2.3 GROUP_MEMBER
# ---------------------------------------------------------------------------

class GroupMember(models.Model):
    class RoleInGroup(models.TextChoices):
        LEADER = "leader", "Leader"
        MEMBER = "member", "Member"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(ProjectGroup, on_delete=models.CASCADE, related_name="members")
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="group_memberships",
        limit_choices_to={"role": User.Role.STUDENT},
    )
    role_in_group = models.CharField(max_length=20, choices=RoleInGroup.choices)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "group_member"
        unique_together = ("group", "student")

    def __str__(self):
        return f"{self.student.full_name} -> {self.group.group_name}"


# ---------------------------------------------------------------------------
# 2.4 ADVISOR_ASSIGNMENT
# ---------------------------------------------------------------------------

class AdvisorAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(ProjectGroup, on_delete=models.CASCADE, related_name="advisor_assignments")
    advisor = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="advisor_assignments",
        limit_choices_to={"role": User.Role.ADVISOR},
    )
    assigned_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="advisor_assignments_made"
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "advisor_assignment"
        unique_together = ("group", "advisor")

    def __str__(self):
        return f"{self.advisor.full_name} advises {self.group.group_name}"


# ---------------------------------------------------------------------------
# 2.5 PROJECT
# ---------------------------------------------------------------------------

class Project(models.Model):
    class Stage(models.TextChoices):
        IDEA = "idea", "Idea"
        PROPOSAL = "proposal", "Proposal"
        PLANNING = "planning", "Planning"
        DEVELOPMENT = "development", "Development"
        SUBMITTED = "submitted", "Submitted"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.OneToOneField(ProjectGroup, on_delete=models.CASCADE, related_name="project")
    title = models.CharField(max_length=255)
    sdg_alignment = models.CharField(max_length=255, null=True, blank=True)
    problem_statement = models.TextField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.IDEA)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "project"

    def __str__(self):
        return self.title


# ---------------------------------------------------------------------------
# 2.6 SUBMISSION
# ---------------------------------------------------------------------------

class Submission(models.Model):
    class SubmissionType(models.TextChoices):
        IDEA = "idea", "Idea"
        PROPOSAL = "proposal", "Proposal"
        PROGRESS_REPORT = "progress_report", "Progress Report"
        PROTOTYPE_DOC = "prototype_doc", "Prototype Doc"
        FINAL_REPORT = "final_report", "Final Report"
        POSTER = "poster", "Poster"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        UNDER_REVIEW = "under_review", "Under Review"
        APPROVED = "approved", "Approved"
        REVISION_REQUIRED = "revision_required", "Revision Required"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="submissions")
    submitted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="submissions"
    )
    submission_type = models.CharField(max_length=20, choices=SubmissionType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "submission"

    def __str__(self):
        return f"{self.get_submission_type_display()} — {self.project.title}"


# ---------------------------------------------------------------------------
# 2.7 DOCUMENT
# ---------------------------------------------------------------------------

class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name="documents")
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="documents_uploaded")
    file = models.FileField(upload_to="submissions/%Y/%m/")
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)  # MIME type
    file_size_kb = models.PositiveIntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "document"

    def __str__(self):
        return self.file_name


# ---------------------------------------------------------------------------
# 2.8 PROGRESS_LOG
# ---------------------------------------------------------------------------

class ProgressLog(models.Model):
    class LogType(models.TextChoices):
        MILESTONE = "milestone", "Milestone"
        WEEKLY_UPDATE = "weekly_update", "Weekly Update"
        MEETING_RECORD = "meeting_record", "Meeting Record"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="progress_logs")
    logged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="progress_logs")
    log_type = models.CharField(max_length=20, choices=LogType.choices)
    title = models.CharField(max_length=255)
    description = models.TextField()
    blockers = models.TextField(null=True, blank=True)
    log_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "progress_log"
        ordering = ["-log_date"]

    def __str__(self):
        return f"{self.title} ({self.log_date})"


# ---------------------------------------------------------------------------
# 2.9 FEEDBACK
# ---------------------------------------------------------------------------

class Feedback(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name="feedback")
    advisor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="feedback_given",
        limit_choices_to={"role": User.Role.ADVISOR},
    )
    comment = models.TextField()
    given_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "feedback"

    def __str__(self):
        return f"Feedback on {self.submission_id} by {self.advisor}"


# ---------------------------------------------------------------------------
# 2.10 EVALUATION
# ---------------------------------------------------------------------------

class Evaluation(models.Model):
    class EvaluationType(models.TextChoices):
        ADVISOR = "advisor", "Advisor"
        PEER = "peer", "Peer"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="evaluations")
    evaluator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="evaluations_given")
    evaluation_type = models.CharField(max_length=20, choices=EvaluationType.choices)
    criteria_scores = models.JSONField()  # e.g. {"technical": 27, "teamwork": 14}
    total_score = models.FloatField()
    weight_percent = models.FloatField()  # e.g. 62.5 for advisor, 5 for peer
    remarks = models.TextField(null=True, blank=True)
    evaluated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "evaluation"

    def __str__(self):
        return f"{self.evaluation_type} eval — {self.project.title}: {self.total_score}"


# ---------------------------------------------------------------------------
# 2.11 ARCHIVE
# ---------------------------------------------------------------------------

class Archive(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name="archive_entry")
    final_title = models.CharField(max_length=255)
    department_mix = models.CharField(max_length=255)
    academic_year = models.CharField(max_length=20)
    keywords = models.TextField()  # comma-separated
    abstract = models.TextField(null=True, blank=True)
    report_file = models.FileField(upload_to="archive/%Y/")
    published_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="archives_published")
    published_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "archive"

    def __str__(self):
        return self.final_title


# ---------------------------------------------------------------------------
# 2.12 NOTIFICATION
# ---------------------------------------------------------------------------

class Notification(models.Model):
    class NotifType(models.TextChoices):
        DEADLINE = "deadline", "Deadline"
        SUBMISSION = "submission", "Submission"
        FEEDBACK = "feedback", "Feedback"
        EVALUATION = "evaluation", "Evaluation"
        SYSTEM = "system", "System"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=255)
    message = models.TextField()
    notif_type = models.CharField(max_length=20, choices=NotifType.choices)
    is_read = models.BooleanField(default=False)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notification"
        ordering = ["-sent_at"]

    def __str__(self):
        return f"{self.title} -> {self.recipient.full_name}"


# ---------------------------------------------------------------------------
# 2.13 AUDIT_LOG
# ---------------------------------------------------------------------------

class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = "create", "Create"
        UPDATE = "update", "Update"
        DELETE = "delete", "Delete"
        LOGIN = "login", "Login"
        LOGOUT = "logout", "Logout"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="audit_entries")
    action = models.CharField(max_length=20, choices=Action.choices)
    target_table = models.CharField(max_length=100)
    target_id = models.UUIDField(null=True, blank=True)
    detail = models.TextField(null=True, blank=True)
    performed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_log"
        ordering = ["-performed_at"]

    def __str__(self):
        return f"{self.actor} {self.action} {self.target_table} @ {self.performed_at}"
