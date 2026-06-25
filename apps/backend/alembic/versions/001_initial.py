"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('age_range', sa.String(20), nullable=True),
        sa.Column('sex', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('last_active_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('user_id')
    )

    op.create_table(
        'sessions',
        sa.Column('session_id', sa.String(36), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('session_number', sa.Integer(), nullable=False),
        sa.Column('completion_rate', sa.Float(), nullable=True),
        sa.Column('tasks_completed', postgresql.ARRAY(sa.String()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('session_id')
    )
    op.create_index('ix_sessions_user_id', 'sessions', ['user_id'])

    op.create_table(
        'trials',
        sa.Column('trial_id', sa.String(36), nullable=False),
        sa.Column('session_id', sa.String(36), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('task_type', sa.String(50), nullable=False),
        sa.Column('stimulus', sa.String(50), nullable=False),
        sa.Column('correct_response', sa.String(20), nullable=False),
        sa.Column('user_response', sa.String(20), nullable=True),
        sa.Column('reaction_time', sa.Float(), nullable=True),
        sa.Column('accuracy', sa.Boolean(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('trial_number', sa.Integer(), nullable=False),
        sa.Column('block_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('device_type', sa.String(100), nullable=True),
        sa.Column('browser', sa.String(100), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.session_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('trial_id')
    )
    op.create_index('ix_trials_session_id', 'trials', ['session_id'])
    op.create_index('ix_trials_user_id', 'trials', ['user_id'])
    op.create_index('ix_trials_session_task', 'trials', ['session_id', 'task_type'])
    op.create_index('ix_trials_user_task', 'trials', ['user_id', 'task_type'])

    op.create_table(
        'session_analytics',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('session_id', sa.String(36), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('task_type', sa.String(50), nullable=False),
        sa.Column('mean_rt', sa.Float(), nullable=False),
        sa.Column('median_rt', sa.Float(), nullable=False),
        sa.Column('rt_std', sa.Float(), nullable=False),
        sa.Column('rt_cv', sa.Float(), nullable=False),
        sa.Column('accuracy', sa.Float(), nullable=False),
        sa.Column('commission_errors', sa.Integer(), nullable=True),
        sa.Column('omission_errors', sa.Integer(), nullable=True),
        sa.Column('computed_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.session_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_analytics_session_id', 'session_analytics', ['session_id'])
    op.create_index('ix_analytics_user_id', 'session_analytics', ['user_id'])
    op.create_index('ix_analytics_session_task', 'session_analytics', ['session_id', 'task_type'], unique=True)

    op.create_table(
        'baselines',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('metric_name', sa.String(100), nullable=False),
        sa.Column('baseline_mean', sa.Float(), nullable=False),
        sa.Column('baseline_std', sa.Float(), nullable=False),
        sa.Column('baseline_median', sa.Float(), nullable=False),
        sa.Column('session_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_baselines_user_id', 'baselines', ['user_id'])
    op.create_index('ix_baselines_user_metric', 'baselines', ['user_id', 'metric_name'], unique=True)

    op.create_table(
        'anomaly_results',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('session_id', sa.String(36), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('anomaly_score', sa.Float(), nullable=False),
        sa.Column('is_anomaly', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('features', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('computed_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.session_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_anomalies_session_id', 'anomaly_results', ['session_id'])
    op.create_index('ix_anomalies_user_id', 'anomaly_results', ['user_id'])

    op.create_table(
        'insights',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('insight_type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.String(1000), nullable=False),
        sa.Column('severity', sa.String(20), nullable=False),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_insights_user_id', 'insights', ['user_id'])
    op.create_index('ix_insights_user_created', 'insights', ['user_id', 'created_at'])


def downgrade() -> None:
    op.drop_table('insights')
    op.drop_table('anomaly_results')
    op.drop_table('baselines')
    op.drop_table('session_analytics')
    op.drop_table('trials')
    op.drop_table('sessions')
    op.drop_table('users')