import { X, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ToolsModal({ isOpen, onClose }: ToolsModalProps) {
  const tools = [
    { name: 'Gmail', icon: '📧' },
    { name: 'Google Drive', icon: '📁' },
    { name: 'Google Docs', icon: '📄' },
    { name: 'Google Sheets', icon: '📊' },
    { name: 'Google Slides', icon: '📽️' },
    { name: 'Google Calendar', icon: '📅' },
    { name: 'Google Tasks', icon: '✅' },
    { name: 'Google Contacts', icon: '👥' },
    { name: 'Google Forms', icon: '📝' },
    { name: 'Google Chat', icon: '💬' },
    { name: 'YouTube', icon: '🎥' },
    { name: 'Google Analytics', icon: '📈' },
    { name: 'Google Maps', icon: '🗺️' },
    { name: 'Google Photos', icon: '🖼️' },
    { name: 'Google Fit', icon: '💪' },
    { name: 'Zapier MCP', icon: '⚡' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex flex-col overflow-y-auto bg-[#020302]"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.10] bg-[#020302] px-6 pb-8 pt-16">
            <h2 className="text-[15px] font-black uppercase tracking-[0.18em] text-white">Tools & Integrations</h2>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-lime-300/25 bg-lime-300/[0.05] text-lime-300/85 transition-colors hover:border-lime-300/50 hover:text-lime-200"
              aria-label="Close tools"
              title="Close tools"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 px-6 pb-32">
            <div className="py-8">
              <div className="space-y-2">
                {tools.map((tool) => (
                  <div
                    key={tool.name}
                    className="flex items-center gap-4 rounded-[16px] border border-white/[0.08] bg-white/[0.02] p-4 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/[0.05] text-xl">
                      {tool.icon}
                    </div>
                    <div className="flex flex-1 items-center justify-between">
                      <span className="text-[14px] font-medium text-white">{tool.name}</span>
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded-[6px] border-white/[0.25] bg-white/[0.05] text-lime-400 focus:ring-2 focus:ring-lime-400/50 focus:ring-offset-0"
                        defaultChecked={true}
                        aria-label={`Toggle ${tool.name} integration`}
                        title={`Toggle ${tool.name} integration`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="fixed bottom-0 left-0 right-0 border-t border-white/[0.10] bg-black/95 p-4">
            <button
              onClick={onClose}
              className="flex w-full items-center justify-center gap-3 rounded-[22px] bg-lime-400 py-5 text-[13px] font-black uppercase tracking-[0.16em] text-black transition-all hover:bg-lime-300 active:scale-95"
            >
              <CheckCircle className="h-4 w-4" />
              DONE
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
