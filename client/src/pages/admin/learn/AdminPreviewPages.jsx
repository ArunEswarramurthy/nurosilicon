import { useParams } from 'react-router-dom';
import PreviewShell from './PreviewShell';
import CourseOverviewPage from '../../student/learn/CourseOverviewPage';
import LessonViewerPage from '../../student/learn/LessonViewerPage';

export function AdminCoursePreviewPage() {
  const { slug } = useParams();
  return (
    <PreviewShell slug={slug}>
      <div style={{ padding: 'clamp(12px,2vw,20px) clamp(12px,2.5vw,28px)' }}>
        <CourseOverviewPage previewMode />
      </div>
    </PreviewShell>
  );
}

export function AdminLessonPreviewPage() {
  const { slug, lessonId } = useParams();
  return (
    <PreviewShell slug={slug} lessonId={lessonId}>
      <div style={{ height: 'calc(100vh - 40px)', overflow: 'hidden' }}>
        <LessonViewerPage previewMode />
      </div>
    </PreviewShell>
  );
}
