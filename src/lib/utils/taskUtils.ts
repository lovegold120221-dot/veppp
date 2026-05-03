export interface ActionTask {
  id: string;
  serviceName?: string;
  action?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  createdAt: number;
  updatedAt: number;
}

// Maps an in-flight tool call to one of the 8 background-task phases from the
// UI mockup: listening, understanding, planning, searching, generating,
// executing, permission, finalizing. Pure function of task metadata — no
// LLM input, so the widget can never "make up" a phase.
export type TaskPhase = {
  key: 'listening' | 'understanding' | 'planning' | 'searching' | 'generating' | 'executing' | 'permission' | 'finalizing';
  label: string;
  color: string;
  visual: 'wave' | 'orbit' | 'radar' | 'spinner';
};

export const pickTaskPhase = (task: { serviceName?: string; action?: string; status: string; result?: string }): TaskPhase => {
  if (task.status === 'completed') {
    const failed = /error|failed|cannot|denied/i.test(task.result || '');
    return failed
      ? { key: 'permission', label: 'Needs attention', color: '#ff6b91', visual: 'spinner' }
      : { key: 'finalizing', label: 'Done', color: '#5cebd7', visual: 'spinner' };
  }
  
  const txt = `${task.serviceName || ''} ${task.action || ''}`.toLowerCase();
  
  if (/search|find|look\s*up|query|research/.test(txt))
    return { key: 'searching', label: 'Searching', color: '#5ed982', visual: 'radar' };
  
  if (/draft|compose|write|generate|summar|caption|translate/.test(txt))
    return { key: 'generating', label: 'Generating', color: '#ffd93d', visual: 'wave' };
  
  if (/send|email|message|notify|contact/.test(txt))
    return { key: 'executing', label: 'Executing', color: '#6bcf7f', visual: 'orbit' };
  
  if (/calculate|compute|analyze|process/.test(txt))
    return { key: 'planning', label: 'Processing', color: '#4ecdc4', visual: 'wave' };
  
  if (/read|fetch|download|get|retrieve/.test(txt))
    return { key: 'listening', label: 'Loading', color: '#95e1d3', visual: 'wave' };
  
  return { key: 'understanding', label: 'Working', color: '#a8e6cf', visual: 'orbit' };
};

export const createTask = (serviceName?: string, action?: string): ActionTask => ({
  id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  serviceName,
  action,
  status: 'pending',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const updateTaskStatus = (
  tasks: ActionTask[],
  taskId: string,
  status: ActionTask['status'],
  result?: string
): ActionTask[] => {
  return tasks.map(task => 
    task.id === taskId 
      ? { ...task, status, result, updatedAt: Date.now() }
      : task
  );
};

export const removeCompletedTasks = (tasks: ActionTask[]): ActionTask[] => {
  return tasks.filter(task => task.status !== 'completed');
};

export const getActiveTasks = (tasks: ActionTask[]): ActionTask[] => {
  return tasks.filter(task => task.status === 'pending' || task.status === 'running');
};
