import React from 'react';
import { Terminal } from 'lucide-react';

interface LogConsoleProps {
  logs: string[];
}

export const LogConsole: React.FC<LogConsoleProps> = ({ logs }) => {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700">
        <Terminal className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-medium text-slate-300">System Logs</span>
        <span className="text-xs text-slate-500 ml-auto">{logs.length} entries</span>
      </div>
      <div className="h-[500px] overflow-y-auto p-4 font-mono text-sm space-y-1">
        {logs.length === 0 ? (
          <div className="text-slate-500 text-center py-12">No logs yet</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`${
              log.includes('ERROR') ? 'text-red-400' : 
              log.includes('SUCCESS') ? 'text-green-400' : 
              log.includes('WARNING') ? 'text-yellow-400' : 
              'text-slate-400'
            }`}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
