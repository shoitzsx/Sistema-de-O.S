import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, CheckCircle2, X } from 'lucide-react';

interface FirstLoginOnboardingProps {
  open: boolean;
  onClose: () => void;
}

interface OnboardingStep {
  title: string;
  description: string;
  bullets: string[];
}

const STEPS: OnboardingStep[] = [
  {
    title: 'Criar O.S em menos de 1 minuto',
    description: 'Abra uma nova ordem com os campos essenciais para evitar retrabalho no campo.',
    bullets: [
      'Vá para Ordens de Serviço > Nova O.S.',
      'Escolha a máquina e o tipo de manutenção.',
      'Preencha componente e descrição com detalhes claros.'
    ]
  },
  {
    title: 'Finalizar O.S com rastreabilidade',
    description: 'Ao concluir o serviço, registre o relatório final para histórico técnico e auditoria.',
    bullets: [
      'Clique em Finalizar na ordem em andamento.',
      'Inclua o que foi trocado, ajustado e testado.',
      'Confirme para encerrar e atualizar os indicadores.'
    ]
  },
  {
    title: 'Achar rápido no histórico',
    description: 'Use busca global, filtros por data/status e salve combinações favoritas.',
    bullets: [
      'Use a busca para máquina, responsável ou componente.',
      'Aplique filtros de status, tipo e intervalo de datas.',
      'Salve filtros para reutilizar no dia a dia.'
    ]
  }
];

export default function FirstLoginOnboarding({ open, onClose }: FirstLoginOnboardingProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = useMemo(() => STEPS[stepIndex], [stepIndex]);

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEPS.length - 1;

  const handleClose = () => {
    setStepIndex(0);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
          >
            <div className="bg-emerald-700 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-xs uppercase tracking-wider">Boas-vindas</p>
                <h3 className="text-xl font-bold">Passo a passo inicial</h3>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-white/15 transition-colors"
                aria-label="Fechar onboarding"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="mb-5 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Etapa {stepIndex + 1}</span>
                <span>/</span>
                <span>{STEPS.length}</span>
              </div>

              <h4 className="text-2xl font-bold text-slate-900 mb-2">{step.title}</h4>
              <p className="text-slate-600 mb-5">{step.description}</p>

              <div className="space-y-3">
                {step.bullets.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-emerald-600 mt-0.5" />
                    <p className="text-sm text-slate-700">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-between">
                <div className="flex gap-2">
                  {!isFirstStep && (
                    <button
                      onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <ArrowLeft size={16} /> Voltar
                    </button>
                  )}
                </div>

                {!isLastStep ? (
                  <button
                    onClick={() => setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1))}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2"
                  >
                    Próximo <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    Começar a usar
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
