import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  RotateCcw,
  Copy,
  Check,
} from 'lucide-react';
import type { ResearchAnswer, QueryStatus } from '@/types/research';

interface AnswerDisplayProps {
  status: QueryStatus;
  result: ResearchAnswer | null;
  error: string | null;
  onRetry?: () => void;
  onSelectFollowup?: (question: string) => void;
}

const LOADING_MESSAGES = [
  'Initializing Biospace Intelligence Agent...',
  'Querying NASA OSDR & GeneLab Repository...',
  'Executing differential gene expression pipeline...',
  'Cross-referencing microgravity tissue transcriptomics...',
  'Synthesizing biological evidence...',
];

export default function AnswerDisplay({
  status,
  result,
  error,
  onRetry,
}: AnswerDisplayProps) {
  if (status === 'idle') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full text-left font-sans"
    >
      <AnimatePresence mode="wait">
        {status === 'loading' && <LoadingState key="loading" />}
        {status === 'error' && <ErrorState key="error" error={error} onRetry={onRetry} />}
        {status === 'success' && result && (
          <SuccessState key="success" result={result} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="py-2 flex items-center gap-2.5 text-left"
    >
      <div className="relative w-4 h-4 flex items-center justify-center flex-shrink-0">
        <div className="absolute inset-0 rounded-full border border-[#f97316]/50 animate-spin" style={{ animationDuration: '3s' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
      </div>
      <div className="h-5 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-[13px] text-white/70 font-mono"
          >
            {LOADING_MESSAGES[messageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ErrorState({ error, onRetry }: { error: string | null; onRetry?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-3.5 rounded-xl border border-red-500/30 bg-black/90 text-left space-y-2.5"
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-red-400 font-mono">
        <AlertCircle className="w-4 h-4" />
        <span>Research Query Warning</span>
      </div>
      <p className="text-[13px] text-white/70 leading-relaxed font-sans">
        {error || 'An unexpected issue occurred while processing. You can retry your query.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/80 hover:text-white transition-all font-mono"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#f97316]" />
          Retry
        </button>
      )}
    </motion.div>
  );
}

function SuccessState({
  result,
}: {
  result: ResearchAnswer;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-3.5 w-full text-left font-sans"
    >
      {/* Clean Claude 3.5 Output Text */}
      <div className="text-[13.5px] text-white/85 leading-[1.65] space-y-3 font-sans text-left">
        {result.answer.split('\n\n').map((paragraph, index) => {
          const trimmed = paragraph.trim();
          // Markdown headers
          if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
            return (
              <h3 key={index} className="text-xs font-bold text-white tracking-widest uppercase pt-2 border-b border-[#f97316]/20 pb-1 font-mono text-left">
                {trimmed.replace(/^#+\s*/, '')}
              </h3>
            );
          }
          // Bold header paragraphs like "**Summary:** text..." or "**Experimental Conditions:**"
          const boldMatch = trimmed.match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/);
          if (boldMatch) {
            return (
              <div key={index} className="space-y-1">
                <h3 className="text-xs font-bold text-white tracking-widest uppercase pt-2 border-b border-[#f97316]/20 pb-1 font-mono text-left">
                  {boldMatch[1].replace(/:$/, '')}
                </h3>
                {boldMatch[2] && (
                  <p className="leading-[1.65] text-left text-[13.5px] text-white/85">{boldMatch[2]}</p>
                )}
              </div>
            );
          }
          // Numbered list items
          if (/^\d+\.\s/.test(trimmed)) {
            const items = trimmed.split('\n').filter(Boolean);
            return (
              <ol key={index} className="space-y-1.5 pl-1 text-left list-decimal list-inside">
                {items.map((item, i) => (
                  <li key={i} className="text-white/85 text-[13.5px] leading-[1.65]">
                    {item.replace(/^\d+\.\s*/, '')}
                  </li>
                ))}
              </ol>
            );
          }
          // Bullet lists
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const items = trimmed.split('\n');
            return (
              <ul key={index} className="space-y-1.5 pl-1 text-left">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-white/85 text-[13.5px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] mt-1.5 flex-shrink-0" />
                    <span>{item.replace(/^[-*]\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <p key={index} className="leading-[1.65] text-left text-[13.5px] text-white/85">
              {trimmed}
            </p>
          );
        })}
      </div>

      {/* Sources */}
      {result.sources && result.sources.length > 0 && (
        <div className="pt-2 border-t border-white/10">
          <p className="text-[11px] font-mono text-white/40 uppercase tracking-wider mb-2">
            Sources ({result.sources.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.sources.slice(0, 8).map((source, i) => (
              <a
                key={i}
                href={source.url || `https://osdr.nasa.gov/osdr/datasets/${source.datasetId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-white/60 hover:text-[#f97316] hover:border-[#f97316]/30 transition-colors font-mono"
                title={source.title}
              >
                <span>{source.datasetId}</span>
                {source.organism && (
                  <span className="text-white/30">({source.organism})</span>
                )}
              </a>
            ))}
            {result.sources.length > 8 && (
              <span className="text-[11px] text-white/30 font-mono self-center">
                +{result.sources.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Claude Minimal Footer Copy Icon */}
      <div className="flex items-center gap-3 pt-2 text-[11px] font-mono text-white/35">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors"
          title="Copy response"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#f97316]" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </motion.div>
  );
}
