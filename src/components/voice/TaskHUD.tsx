import { motion, AnimatePresence } from 'motion/react';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
export type TaskPhase = 'listening' | 'understanding' | 'planning' | 'searching' | 'generating' | 'executing' | 'permission' | 'finalizing';

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
}

interface TaskHUDProps {
  tasks: Task[];
}

// Maps an in-flight tool call to one of the 8 background-task phases
function pickTaskPhase(task: Task): TaskPhase {
  const elapsed = Date.now() - task.createdAt;
  const status = task.status;

  if (status === 'completed') return 'finalizing';
  if (status === 'failed') return 'finalizing';
  if (status === 'cancelled') return 'finalizing';

  // In-flight progress based on elapsed time
  if (elapsed < 1500) return 'listening';
  if (elapsed < 3000) return 'understanding';
  if (elapsed < 5000) return 'planning';
  if (elapsed < 8000) return 'searching';
  if (elapsed < 12000) return 'generating';
  if (elapsed < 18000) return 'executing';
  return 'permission';
}

const phaseLabels: Record<TaskPhase, string> = {
  listening: 'Listening...',
  understanding: 'Understanding...',
  planning: 'Planning...',
  searching: 'Searching...',
  generating: 'Generating...',
  executing: 'Executing...',
  permission: 'Needs permission',
  finalizing: 'Finalizing...',
};

const phaseIcons: Record<TaskPhase, string> = {
  listening: '👂',
  understanding: '🤔',
  planning: '📝',
  searching: '🔍',
  generating: '⚙️',
  executing: '▶️',
  permission: '🔐',
  finalizing: '✅',
};

export function TaskHUD({ tasks }: TaskHUDProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="absolute bottom-[128px] left-4 right-4 pointer-events-none">
      <div className="mx-auto max-w-[360px] space-y-2">
        <AnimatePresence>
          {tasks.map(task => {
            const phase = pickTaskPhase(task);
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                className="flex items-center gap-3 rounded-[16px] border border-white/[0.10] bg-black/70 px-4 py-3 backdrop-blur-md"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-white/[0.08] text-sm">
                  {phaseIcons[phase]}
                </span>
                <div className="flex-1">
                  <div className="text-[12px] font-semibold text-white/90">{task.name}</div>
                  <div className="text-[10px] text-white/60">{phaseLabels[phase]}</div>
                </div>
                {task.status === 'in-progress' && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-lime-400" />
                )}
                {task.status === 'completed' && (
                  <span className="text-xs text-lime-400">✓</span>
                )}
                {task.status === 'failed' && (
                  <span className="text-xs text-red-400">✗</span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
