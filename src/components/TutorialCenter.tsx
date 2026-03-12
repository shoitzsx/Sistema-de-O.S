import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpenCheck, ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface TutorialItem {
  id: string;
  title: string;
  description: string;
  bullets: string[];
}

interface TutorialCenterProps {
  open: boolean;
  onClose: () => void;
  tutorials: TutorialItem[];
}

export default function TutorialCenter({ open, onClose, tutorials }: TutorialCenterProps) {
  const [selectedId, setSelectedId] = useState<string>('');

  const activeTutorial = useMemo(() => {
    if (!tutorials.length) return null;
    if (!selectedId) return tutorials[0];
    return tutorials.find((item) => item.id === selectedId) || tutorials[0];
  }, [tutorials, selectedId]);

  const activeIndex = useMemo(() => {
    if (!activeTutorial) return -1;
    return tutorials.findIndex((item) => item.id === activeTutorial.id);
  }, [tutorials, activeTutorial]);

  const openPrevious = () => {
    if (activeIndex <= 0) return;
    setSelectedId(tutorials[activeIndex - 1].id);
  };

  const openNext = () => {
    if (activeIndex < 0 || activeIndex >= tutorials.length - 1) return;
    setSelectedId(tutorials[activeIndex + 1].id);
  };

  const handleClose = () => {
    setSelectedId('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
          >
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-xs uppercase tracking-wider">Ajuda e treinamento</p>
                <h3 className="text-xl font-bold">Central de Tutoriais</h3>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Fechar central de tutoriais"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[300px,1fr] min-h-[540px] max-h-[80vh]">
              <aside className="border-r border-slate-100 bg-slate-50 overflow-y-auto">
                <div className="px-4 py-3 border-b border-slate-200">
                  <p className="text-sm font-semibold text-slate-800">Tutoriais disponíveis</p>
                  <p className="text-xs text-slate-500">Mostrando apenas os módulos permitidos para seu perfil.</p>
                </div>

                <div className="p-2 space-y-1">
                  {tutorials.length === 0 && (
                    <div className="text-sm text-slate-500 px-3 py-4">
                      Nenhum tutorial disponível para este usuário.
                    </div>
                  )}

                  {tutorials.map((tutorial) => {
                    const selected = tutorial.id === (activeTutorial?.id || tutorials[0]?.id);
                    return (
                      <button
                        key={tutorial.id}
                        type="button"
                        onClick={() => setSelectedId(tutorial.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                          selected
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-white border-transparent text-slate-700 hover:border-slate-200'
                        }`}
                      >
                        <p className="text-sm font-semibold">{tutorial.title}</p>
                        <p className="text-xs mt-1 text-slate-500 line-clamp-2">{tutorial.description}</p>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="p-6 overflow-y-auto">
                {activeTutorial ? (
                  <>
                    <div className="flex items-start gap-3 mb-6">
                      <div className="bg-emerald-100 text-emerald-700 rounded-lg p-2">
                        <BookOpenCheck size={20} />
                      </div>
                      <div>
                        <h4 className="text-2xl font-bold text-slate-900">{activeTutorial.title}</h4>
                        <p className="text-slate-600 mt-1">{activeTutorial.description}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {activeTutorial.bullets.map((bullet) => (
                        <div key={bullet} className="flex items-start gap-3 border border-slate-100 rounded-lg px-3 py-2.5 bg-slate-50">
                          <span className="mt-1 w-2 h-2 rounded-full bg-emerald-500" />
                          <p className="text-sm text-slate-700">{bullet}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row sm:justify-between gap-3">
                      <button
                        type="button"
                        onClick={openPrevious}
                        disabled={activeIndex <= 0}
                        className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 inline-flex items-center gap-2"
                      >
                        <ChevronLeft size={16} /> Tutorial anterior
                      </button>

                      <button
                        type="button"
                        onClick={openNext}
                        disabled={activeIndex < 0 || activeIndex >= tutorials.length - 1}
                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 inline-flex items-center gap-2"
                      >
                        Próximo tutorial <ChevronRight size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-500">Nenhum tutorial disponível.</div>
                )}
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
