import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { McPrompterPage } from './features/mc-prompter/pages/McPrompterPage';
import { useDraft } from './features/wedding-builder/hooks/useDraft';
import { OwnerBuilderPage } from './features/wedding-builder/pages/OwnerBuilderPage';

export default function App() {
  const {
    draft,
    setDraft,
    saveStatus,
    lastSavedAt,
    saveNow,
    onCompositionStart,
    onCompositionEnd,
  } = useDraft();

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route
          path="/"
          element={
            <OwnerBuilderPage
              draft={draft}
              setDraft={setDraft}
              saveStatus={saveStatus}
              lastSavedAt={lastSavedAt}
              onSaveNow={saveNow}
              compositionHandlers={{ onCompositionStart, onCompositionEnd }}
            />
          }
        />
        <Route path="/mc" element={<McPrompterPage draft={draft} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
