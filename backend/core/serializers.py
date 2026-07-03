from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    AdvisorAssignment,
    Archive,
    AuditLog,
    Document,
    Evaluation,
    Feedback,
    GroupMember,
    Notification,
    Project,
    ProjectGroup,
    ProgressLog,
    Submission,
    User,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "full_name", "email", "role", "department",
            "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "full_name", "email", "role", "department", "password"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class GroupMemberSerializer(serializers.ModelSerializer):
    student_detail = UserSerializer(source="student", read_only=True)

    class Meta:
        model = GroupMember
        fields = ["id", "group", "student", "student_detail", "role_in_group", "joined_at"]
        read_only_fields = ["id", "joined_at"]


class AdvisorAssignmentSerializer(serializers.ModelSerializer):
    advisor_detail = UserSerializer(source="advisor", read_only=True)

    class Meta:
        model = AdvisorAssignment
        fields = ["id", "group", "advisor", "advisor_detail", "assigned_by", "assigned_at"]
        read_only_fields = ["id", "assigned_at"]


class ProjectGroupSerializer(serializers.ModelSerializer):
    members = GroupMemberSerializer(many=True, read_only=True)
    advisor_assignments = AdvisorAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = ProjectGroup
        fields = [
            "id", "group_name", "academic_year", "semester", "department_mix",
            "status", "created_by", "created_at", "members", "advisor_assignments",
        ]
        read_only_fields = ["id", "created_at"]


class ProjectSerializer(serializers.ModelSerializer):
    group_detail = ProjectGroupSerializer(source="group", read_only=True)

    class Meta:
        model = Project
        fields = [
            "id", "group", "group_detail", "title", "sdg_alignment",
            "problem_statement", "description", "stage", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = [
            "id", "submission", "uploaded_by", "file", "file_name",
            "file_type", "file_size_kb", "uploaded_at",
        ]
        read_only_fields = ["id", "uploaded_at", "file_size_kb"]

    def create(self, validated_data):
        f = validated_data.get("file")
        if f is not None:
            validated_data["file_size_kb"] = max(1, f.size // 1024)
            validated_data.setdefault("file_name", f.name)
        return super().create(validated_data)


class FeedbackSerializer(serializers.ModelSerializer):
    advisor_detail = UserSerializer(source="advisor", read_only=True)

    class Meta:
        model = Feedback
        fields = ["id", "submission", "advisor", "advisor_detail", "comment", "given_at"]
        read_only_fields = ["id", "given_at"]


class SubmissionSerializer(serializers.ModelSerializer):
    documents = DocumentSerializer(many=True, read_only=True)
    feedback = FeedbackSerializer(many=True, read_only=True)
    submitted_by_detail = UserSerializer(source="submitted_by", read_only=True)

    class Meta:
        model = Submission
        fields = [
            "id", "project", "submitted_by", "submitted_by_detail", "submission_type",
            "status", "notes", "submitted_at", "reviewed_at", "documents", "feedback",
        ]
        read_only_fields = ["id", "submitted_at"]


class ProgressLogSerializer(serializers.ModelSerializer):
    logged_by_detail = UserSerializer(source="logged_by", read_only=True)

    class Meta:
        model = ProgressLog
        fields = [
            "id", "project", "logged_by", "logged_by_detail", "log_type",
            "title", "description", "blockers", "log_date", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class EvaluationSerializer(serializers.ModelSerializer):
    evaluator_detail = UserSerializer(source="evaluator", read_only=True)

    class Meta:
        model = Evaluation
        fields = [
            "id", "project", "evaluator", "evaluator_detail", "evaluation_type",
            "criteria_scores", "total_score", "weight_percent", "remarks", "evaluated_at",
        ]
        read_only_fields = ["id", "evaluated_at"]


class ArchiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Archive
        fields = [
            "id", "project", "final_title", "department_mix", "academic_year",
            "keywords", "abstract", "report_file", "published_by", "published_at",
        ]
        read_only_fields = ["id", "published_at"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "recipient", "title", "message", "notif_type", "is_read", "sent_at",
        ]
        read_only_fields = ["id", "sent_at"]


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            "id", "actor", "action", "target_table", "target_id", "detail", "performed_at",
        ]
        read_only_fields = ["id", "performed_at"]


class RoleAwareTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds user id, role, and full_name to both the JWT claims and the login response body,
    so the frontend can route to the right dashboard immediately after login."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["full_name"] = user.full_name
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = {
            "id": str(self.user.id),
            "full_name": self.user.full_name,
            "email": self.user.email,
            "role": self.user.role,
            "department": self.user.department,
        }
        return data
