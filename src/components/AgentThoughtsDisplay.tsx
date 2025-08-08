'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  ChevronDown, 
  ChevronRight, 
  Eye, 
  Brain, 
  Play, 
  RotateCcw, 
  Wrench, 
  Users, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Clock, 
  TrendingUp,
  Target,
  Award
} from 'lucide-react';
import { AgentThought, SubAgent, ReasoningStep, Alternative } from '@/types/chat';

interface AgentThoughtsProps {
  thoughts: AgentThought[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

const AgentThoughtsDisplay = ({ thoughts, isExpanded, onToggleExpanded }: AgentThoughtsProps) => {
  const { t } = useTranslation();
  const [compactMode, setCompactMode] = useState(false);

  // 调试日志
  console.log('AgentThoughtsDisplay render:', { 
    thoughts: thoughts.length, 
    isExpanded, 
    thoughtsData: thoughts.map(t => ({ id: t.id, type: t.type, content: t.content?.substring(0, 50) + '...' }))
  });

  // 检查是否需要启用简洁模式（内容过长时）
  const shouldUseCompactMode = thoughts.some(thought => 
    thought.content.length > 200 || 
    (thought.tool_output && JSON.stringify(thought.tool_output).length > 200)
  );

  if (thoughts.length === 0) {
    console.log('AgentThoughtsDisplay: No thoughts to display');
    return null;
  }

  return (
    <div className="border border-purple-200 dark:border-purple-700 rounded-lg bg-purple-50 dark:bg-purple-900/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between min-h-0">
        <button
          onClick={onToggleExpanded}
          className="flex-1 flex items-center justify-between p-3 hover:bg-purple-100 dark:hover:bg-purple-800/30 transition-colors min-w-0"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <span className="font-medium text-purple-800 dark:text-purple-200 truncate">
              {t('agent.showThoughts')}
            </span>
            <span className="text-sm text-purple-600 dark:text-purple-400 flex-shrink-0">
              ({thoughts.length})
            </span>
          </div>
          <div className="flex-shrink-0 ml-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            )}
          </div>
        </button>
        
        {/* 简洁模式按钮 - 独立按钮 */}
        {shouldUseCompactMode && (
          <button
            onClick={() => setCompactMode(!compactMode)}
            className="mr-3 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-800 rounded-md hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors flex-shrink-0"
            title={compactMode ? '展开详情' : '简洁模式'}
          >
            {compactMode ? '详细' : '简洁'}
          </button>
        )}
      </div>

      {/* Content */}
      <div className={`border-t border-purple-200 dark:border-purple-700 agent-thoughts-content ${
        isExpanded ? 'expanded' : 'collapsed'
      }`}>
        {isExpanded && (
          <div className="space-y-0">
            {thoughts.map((thought) => (
              <ThoughtItem key={thought.id} thought={thought} compactMode={compactMode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface ThoughtItemProps {
  thought: AgentThought;
  compactMode?: boolean;
}

const ThoughtItem = ({ thought, compactMode = false }: ThoughtItemProps) => {
  const { t } = useTranslation();
  // 默认展开状态：智能体思考项保持展开，不自动折叠
  const [isExpanded, setIsExpanded] = useState(true);

  // 调试日志
  console.log('ThoughtItem render:', { 
    id: thought.id, 
    type: thought.type, 
    status: thought.status,
    contentLength: thought.content?.length || 0,
    content: thought.content?.substring(0, 100) + '...',
    isExpanded 
  });

  // 移除自动折叠逻辑，让用户手动控制展开/折叠
  // useEffect(() => {
  //   if (thought.status === 'completed' && isExpanded) {
  //     const timer = setTimeout(() => {
  //       setIsExpanded(false);
  //     }, 5000);
  //     return () => clearTimeout(timer);
  //   }
  // }, [thought.status, isExpanded]);

  // 简洁模式下的内容截取
  const truncateContent = (content: string, maxLength: number = 100) => {
    if (!compactMode || content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const getTypeIcon = (type: AgentThought['type']) => {
    switch (type) {
      case 'observation':
        return <Eye className="h-4 w-4 text-blue-500" />;
      case 'thought':
        return <Brain className="h-4 w-4 text-purple-500" />;
      case 'action':
        return <Play className="h-4 w-4 text-green-500" />;
      case 'reflection':
        return <RotateCcw className="h-4 w-4 text-orange-500" />;
      case 'tool_use':
        return <Wrench className="h-4 w-4 text-cyan-500" />;
      case 'collaboration':
        return <Users className="h-4 w-4 text-indigo-500" />;
      default:
        return <Brain className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: AgentThought['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'waiting':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getTypeLabel = (type: AgentThought['type']) => {
    return t(`agent.${type}`);
  };

  return (
    <div className="p-3 border-b border-purple-100 dark:border-purple-800 last:border-b-0">
      {/* Thought Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between mb-2 p-2 rounded-md transition-all duration-200 ${
          thought.status === 'completed' 
            ? 'hover:bg-green-50 dark:hover:bg-green-900/20 bg-green-25 dark:bg-green-950/10' 
            : 'hover:bg-purple-50 dark:hover:bg-purple-800/20'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getTypeIcon(thought.type)}
          <span className={`font-medium text-sm transition-colors duration-200 break-words ${
            thought.status === 'completed' 
              ? 'text-green-800 dark:text-green-200' 
              : 'text-gray-800 dark:text-gray-200'
          }`}>
            {getTypeLabel(thought.type)}: {thought.title}
            {thought.status === 'completed' && (
              <span className="ml-2 text-xs text-green-600 dark:text-green-400">✓</span>
            )}
          </span>
          {getStatusIcon(thought.status)}
        </div>
        <div className="flex-shrink-0 ml-2">
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-gray-500 transition-transform duration-200" />
          ) : (
            <ChevronRight className="h-3 w-3 text-gray-500 transition-transform duration-200" />
          )}
        </div>
      </button>

      {/* Thought Content */}
      {isExpanded && (
        <div className="pl-6 space-y-3 transition-all duration-300 ease-in-out">
          {/* Main Content */}
          <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700">
            {thought.content && thought.content.trim().length > 0 ? (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => (
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2 last:mb-0">
                      {children}
                    </p>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      {children}
                    </h3>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-800 dark:text-gray-200">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-gray-700 dark:text-gray-300">
                      {children}
                    </em>
                  ),
                  code: ({ children }) => (
                    <code className="text-sm text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded font-mono">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto border border-gray-200 dark:border-gray-700 my-2">
                      {children}
                    </pre>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-1 mb-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-1 mb-2">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm text-gray-700 dark:text-gray-300">
                      {children}
                    </li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-purple-300 dark:border-purple-600 pl-4 py-2 my-2 bg-purple-50 dark:bg-purple-900/20 rounded-r">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-2">
                      <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-md">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-left text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 border-b border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300">
                      {children}
                    </td>
                  ),
                }}
              >
                {compactMode && thought.content.length > 100 ? truncateContent(thought.content) : thought.content}
              </ReactMarkdown>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                {thought.status === 'running' ? '正在生成内容...' : '暂无内容'}
              </div>
            )}
            {compactMode && thought.content && thought.content.length > 100 && (
              <button
                onClick={() => setIsExpanded(true)}
                className="ml-2 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
              >
                展开
              </button>
            )}
          </div>

          {/* Tool Use */}
          {thought.tool_name && (
            <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-cyan-100 dark:bg-cyan-800/30 border-b border-cyan-200 dark:border-cyan-700">
                <span className="text-xs text-cyan-700 dark:text-cyan-300">
                  {t('agent.toolsAvailable')}: {thought.tool_name}
                </span>
                <Wrench className="h-3 w-3 text-cyan-500" />
              </div>
              {thought.tool_input && (
                <div className="p-3 text-sm text-cyan-800 dark:text-cyan-200 border-b border-cyan-200 dark:border-cyan-700">
                  <strong>输入:</strong>
                  <pre className="mt-1 text-xs overflow-x-auto">
                    {JSON.stringify(thought.tool_input, null, 2)}
                  </pre>
                </div>
              )}
              {thought.tool_output && (
                <div className="p-3 text-sm text-cyan-800 dark:text-cyan-200">
                  <strong>输出:</strong>
                  <pre className="mt-1 text-xs overflow-x-auto">
                    {JSON.stringify(thought.tool_output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Reflection */}
          {thought.reflection && (
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-orange-100 dark:bg-orange-800/30 border-b border-orange-200 dark:border-orange-700">
                <span className="text-xs text-orange-700 dark:text-orange-300">
                  {t('agent.reflection')}
                </span>
                <RotateCcw className="h-3 w-3 text-orange-500" />
              </div>
              <div className="p-3 text-sm text-orange-800 dark:text-orange-200">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => (
                      <p className="text-sm text-orange-800 dark:text-orange-200 leading-relaxed mb-2 last:mb-0">
                        {children}
                      </p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-orange-900 dark:text-orange-100">
                        {children}
                      </strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic text-orange-700 dark:text-orange-300">
                        {children}
                      </em>
                    ),
                    code: ({ children }) => (
                      <code className="text-sm text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-800/50 px-1.5 py-0.5 rounded font-mono">
                        {children}
                      </code>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1 mb-2">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-1 mb-2">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-sm text-orange-800 dark:text-orange-200">
                        {children}
                      </li>
                    ),
                  }}
                >
                  {thought.reflection}
                </ReactMarkdown>
              </div>
              {thought.improvement && (
                <div className="p-3 text-sm text-orange-800 dark:text-orange-200 border-t border-orange-200 dark:border-orange-700">
                  <strong>改进建议:</strong> 
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="text-sm text-orange-800 dark:text-orange-200 leading-relaxed mb-1 last:mb-0 inline ml-1">
                          {children}
                        </p>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-orange-900 dark:text-orange-100">
                          {children}
                        </strong>
                      ),
                    }}
                  >
                    {thought.improvement}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {/* Reasoning Steps */}
          {thought.reasoning_steps && thought.reasoning_steps.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <TrendingUp className="h-4 w-4" />
                {t('agent.reasoningSteps')}
              </div>
              {thought.reasoning_steps.map((step, index) => (
                <ReasoningStepDisplay key={index} step={step} />
              ))}
            </div>
          )}

          {/* Alternatives */}
          {thought.alternatives && thought.alternatives.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Target className="h-4 w-4" />
                {t('agent.alternatives')}
              </div>
              {thought.alternatives.map((alt, index) => (
                <AlternativeDisplay key={index} alternative={alt} />
              ))}
            </div>
          )}

          {/* Collaboration Context */}
          {thought.collaborator && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-md p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2">
                <Users className="h-4 w-4" />
                协作对象: {thought.collaborator}
              </div>
              {thought.context_shared && (
                <pre className="text-xs text-indigo-600 dark:text-indigo-400 overflow-x-auto">
                  {JSON.stringify(thought.context_shared, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ReasoningStepProps {
  step: ReasoningStep;
}

const ReasoningStepDisplay = ({ step }: ReasoningStepProps) => {
  const { t } = useTranslation();
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
          步骤 {step.step}: {step.description}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {t('agent.confidence')}:
          </span>
          <span className={`text-xs font-medium ${getConfidenceColor(step.confidence)}`}>
            {(step.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="text-sm text-gray-700 dark:text-gray-300">
        <strong>结论:</strong> {step.conclusion}
      </div>
    </div>
  );
};

interface AlternativeProps {
  alternative: Alternative;
}

const AlternativeDisplay = ({ alternative }: AlternativeProps) => {
  const { t } = useTranslation();
  
  const getFeasibilityColor = (feasibility: number) => {
    if (feasibility >= 0.8) return 'text-green-600 dark:text-green-400';
    if (feasibility >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
          {alternative.option}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {t('agent.feasibility')}:
          </span>
          <span className={`text-xs font-medium ${getFeasibilityColor(alternative.feasibility)}`}>
            {(alternative.feasibility * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <strong className="text-green-600 dark:text-green-400">优点:</strong>
          <ul className="mt-1 space-y-1 text-gray-600 dark:text-gray-400">
            {alternative.pros.map((pro, index) => (
              <li key={index}>• {pro}</li>
            ))}
          </ul>
        </div>
        <div>
          <strong className="text-red-600 dark:text-red-400">缺点:</strong>
          <ul className="mt-1 space-y-1 text-gray-600 dark:text-gray-400">
            {alternative.cons.map((con, index) => (
              <li key={index}>• {con}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

interface SubAgentDisplayProps {
  agent: SubAgent;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SubAgentDisplay = ({ agent }: SubAgentDisplayProps) => {
  const { t } = useTranslation();
  
  const getStatusColor = (status: SubAgent['status']) => {
    switch (status) {
      case 'thinking':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'working':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'blocked':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-800 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">
              {agent.name.charAt(0)}
            </span>
          </div>
          <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
            {agent.name}
          </span>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
          {t(`agent.${agent.status}`)}
        </span>
      </div>
      
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
        <strong>{t('agent.expertise')}:</strong> {agent.expertise.join(', ')}
      </div>

      {agent.current_task && (
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          <strong>{t('agent.currentTask')}:</strong> {agent.current_task}
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>{t('agent.progress')}</span>
          <span>{agent.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${agent.progress}%` }}
          />
        </div>
      </div>

      {agent.deliverable && (
        <div className="text-sm text-gray-800 dark:text-gray-200 bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded">
          <div className="flex items-center gap-1 mb-1">
            <Award className="h-3 w-3 text-indigo-500" />
            <span className="font-medium text-xs">{t('agent.deliverable')}:</span>
          </div>
          {agent.deliverable}
        </div>
      )}

      {agent.tools_available && agent.tools_available.length > 0 && (
        <div className="mt-2 text-xs">
          <strong className="text-gray-600 dark:text-gray-400">{t('agent.toolsAvailable')}:</strong>
          <div className="flex flex-wrap gap-1 mt-1">
            {agent.tools_available.map((tool, index) => (
              <span key={index} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-xs">
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentThoughtsDisplay;
