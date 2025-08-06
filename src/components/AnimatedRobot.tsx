'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface AnimatedRobotProps {
  className?: string;
  isActive?: boolean;
  status?: 'idle' | 'listening' | 'thinking' | 'speaking' | 'typing' | 'error';
  messageCount?: number;
}

export function AnimatedRobot({ 
  className = "w-8 h-8", 
  isActive: _isActive = false, // Prefixed with _ to indicate intentionally unused
  status = 'idle',
  messageCount = 0 
}: AnimatedRobotProps) {
  const { t } = useTranslation();
  const [isBlinking, setIsBlinking] = useState(false);
  const [expression, setExpression] = useState<'normal' | 'happy' | 'thinking' | 'excited' | 'sleepy' | 'focused' | 'error'>('normal');
  const [eyeDirection, setEyeDirection] = useState<'center' | 'left' | 'right' | 'up'>('center');
  const [isHovered, setIsHovered] = useState(false);

  // 眨眼动画 - 只有在可见时才运行
  useEffect(() => {
    if (status === 'error') return; // 错误状态不眨眼
    
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 2000 + Math.random() * 3000);

    return () => clearInterval(blinkInterval);
  }, [status]);

  // 眼睛移动 - 减少频率，优化性能
  useEffect(() => {
    if (status !== 'idle') return; // 非空闲状态不随机移动眼睛
    
    const eyeMovementInterval = setInterval(() => {
      const directions: Array<'center' | 'left' | 'right' | 'up'> = ['center', 'left', 'right', 'up'];
      const randomDirection = directions[Math.floor(Math.random() * directions.length)];
      setEyeDirection(randomDirection);
      
      setTimeout(() => {
        setEyeDirection('center');
      }, 1000 + Math.random() * 1000);
    }, 6000 + Math.random() * 4000); // 增加间隔

    return () => clearInterval(eyeMovementInterval);
  }, [status]);

  // 根据状态直接设置表情和行为
  useEffect(() => {
    switch (status) {
      case 'thinking':
        setExpression('thinking');
        break;
      case 'listening':
        setExpression('focused');
        break;
      case 'speaking':
        setExpression('excited');
        break;
      case 'error':
        setExpression('error');
        break;
      case 'typing':
        setExpression('focused');
        break;
      default:
        if (!isHovered) {
          setExpression('normal');
        }
    }
  }, [status, isHovered]);

  // 庆祝里程碑消息数量
  useEffect(() => {
    if (messageCount > 0 && messageCount % 10 === 0 && status === 'idle') {
      setExpression('excited');
      setTimeout(() => {
        if (status === 'idle') setExpression('normal');
      }, 3000);
    }
  }, [messageCount, status]);

  const getEyeStyle = () => {
    if (isBlinking) return "scaleY-0";
    
    switch (expression) {
      case 'happy':
        return "scaleY-50"; // 眯眼笑
      case 'excited':
        return "scaleY-125"; // 瞪大眼
      case 'thinking':
        return "scaleX-75 scaleY-90"; // 眼睛稍微眯起来
      case 'sleepy':
        return "scaleY-25"; // 困了
      case 'focused':
        return "scaleY-110 scaleX-90"; // 专注
      case 'error':
        return "scaleY-75 scaleX-110"; // 困惑
      default:
        return "scaleY-100";
    }
  };

  const getEyePosition = () => {
    if (isBlinking) return { dx: 0, dy: 0 };
    
    switch (eyeDirection) {
      case 'left':
        return { dx: -0.5, dy: 0 };
      case 'right':
        return { dx: 0.5, dy: 0 };
      case 'up':
        return { dx: 0, dy: -0.5 };
      default:
        return { dx: 0, dy: 0 };
    }
  };

  const getMouthPath = () => {
    switch (expression) {
      case 'happy':
        return "M 6 10 Q 12 16 18 10"; // 大笑
      case 'excited':
        return "M 8 11 Q 12 15 16 11"; // 兴奋的嘴
      case 'thinking':
        return "M 10 12 L 14 12"; // 一条线（思考）
      case 'sleepy':
        return "M 8 13 Q 12 15 16 13"; // 小嘴
      case 'focused':
        return "M 9 12 Q 12 13 15 12"; // 轻微微笑
      case 'error':
        return "M 8 14 Q 12 11 16 14"; // 倒置的嘴（困惑）
      default:
        return "M 8 12 Q 12 14 16 12"; // 普通微笑
    }
  };

  const getHeadAnimation = () => {
    if (isHovered) return "animate-robot-excited";
    
    switch (expression) {
      case 'excited':
        return "animate-robot-excited";
      case 'thinking':
        return "animate-robot-think";
      case 'sleepy':
        return ""; // 不动
      default:
        return "animate-float";
    }
  };

  // 使用 useCallback 优化事件处理函数
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (status === 'idle') {
      setExpression('excited');
    }
  }, [status]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (status === 'idle') {
      setExpression('normal');
    }
  }, [status]);

  const handleClick = useCallback(() => {
    setExpression('excited');
    setTimeout(() => {
      if (status === 'idle') setExpression('normal');
    }, 1000);
  }, [status]);

  // 获取状态描述用于无障碍 - 使用 useMemo 优化
  const statusDescription = useMemo(() => {
    switch (status) {
      case 'thinking': 
        return t('robot.status.thinking');
      case 'listening': 
        return t('robot.status.listening');
      case 'speaking': 
        return t('robot.status.speaking');
      case 'typing': 
        return t('robot.status.typing');
      case 'error': 
        return t('robot.status.error');
      default: 
        if (messageCount > 0) {
          return t('robot.status.idleWithMessages', { count: messageCount });
        }
        return t('robot.status.idle');
    }
  }, [status, messageCount, t]);

  const eyePos = getEyePosition();

  return (
    <div 
      className={`${className} relative cursor-pointer select-none transition-transform hover:scale-105 focus:scale-105 focus:outline-none`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${t('robot.aria.robotAvatar')} - ${statusDescription}`}
      title={statusDescription}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <svg
        viewBox="0 0 24 24"
        className={`w-full h-full transition-all duration-300 ${getHeadAnimation()}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 机器人头部 */}
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="currentColor"
          className="text-blue-500 dark:text-blue-400"
        />
        
        {/* 机器人面部内圈 */}
        <circle
          cx="12"
          cy="12"
          r="8"
          fill="currentColor"
          className="text-blue-100 dark:text-blue-900"
        />
        
        {/* 左眼 */}
        <ellipse
          cx={9 + eyePos.dx}
          cy={9 + eyePos.dy}
          rx="1.5"
          ry="2"
          fill="currentColor"
          className={`text-gray-800 dark:text-gray-200 transition-all duration-300 origin-center ${getEyeStyle()}`}
        />
        
        {/* 右眼 */}
        <ellipse
          cx={15 + eyePos.dx}
          cy={9 + eyePos.dy}
          rx="1.5"
          ry="2"
          fill="currentColor"
          className={`text-gray-800 dark:text-gray-200 transition-all duration-300 origin-center ${getEyeStyle()}`}
        />
        
        {/* 眼睛高光（让眼睛更有神） */}
        <circle
          cx={9.5 + eyePos.dx}
          cy={8.5 + eyePos.dy}
          r="0.5"
          fill="white"
          className={`transition-all duration-300 ${isBlinking ? 'opacity-0' : 'opacity-100'}`}
        />
        <circle
          cx={15.5 + eyePos.dx}
          cy={8.5 + eyePos.dy}
          r="0.5"
          fill="white"
          className={`transition-all duration-300 ${isBlinking ? 'opacity-0' : 'opacity-100'}`}
        />
        
        {/* 嘴巴 */}
        <path
          d={getMouthPath()}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          className="text-gray-800 dark:text-gray-200 transition-all duration-500"
        />
        
        {/* 机器人天线 */}
        <line
          x1="12"
          y1="2"
          x2="12"
          y2="4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-blue-600 dark:text-blue-300"
        />
        <circle
          cx="12"
          cy="2"
          r="1"
          fill="currentColor"
          className={`text-red-500 transition-all duration-300 ${expression === 'excited' ? 'animate-antenna-glow' : 'animate-pulse'}`}
        />
        
        {/* 状态指示器 */}
        {status === 'listening' && (
          <g className="animate-pulse">
            <circle cx="6" cy="18" r="1" fill="currentColor" className="text-green-500" />
            <circle cx="10" cy="16" r="1.5" fill="currentColor" className="text-green-500" />
            <circle cx="14" cy="16" r="1.5" fill="currentColor" className="text-green-500" />
            <circle cx="18" cy="18" r="1" fill="currentColor" className="text-green-500" />
          </g>
        )}
        
        {status === 'speaking' && (
          <g>
            <path 
              d="M 4 15 Q 6 12 8 15 Q 10 12 12 15" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              fill="none" 
              className="text-blue-500 animate-pulse"
            />
            <path 
              d="M 12 15 Q 14 12 16 15 Q 18 12 20 15" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              fill="none" 
              className="text-blue-500 animate-pulse"
              style={{ animationDelay: '0.2s' }}
            />
          </g>
        )}
        
        {status === 'typing' && (
          <g className="animate-bounce">
            <circle cx="10" cy="18" r="0.8" fill="currentColor" className="text-gray-600" />
            <circle cx="12" cy="18" r="0.8" fill="currentColor" className="text-gray-600" style={{ animationDelay: '0.1s' }} />
            <circle cx="14" cy="18" r="0.8" fill="currentColor" className="text-gray-600" style={{ animationDelay: '0.2s' }} />
          </g>
        )}
        
        {/* 思考时的问号 */}
        {expression === 'thinking' && (
          <text
            x="18"
            y="8"
            fontSize="8"
            fill="currentColor"
            className="text-gray-600 dark:text-gray-300 animate-pulse"
          >
            ?
          </text>
        )}
        
        {/* 错误状态的感叹号 */}
        {expression === 'error' && (
          <text
            x="18"
            y="8"
            fontSize="8"
            fill="currentColor"
            className="text-red-500 animate-bounce"
          >
            !
          </text>
        )}
        
        {/* 兴奋时的星星 */}
        {expression === 'excited' && (
          <>
            <text
              x="4"
              y="8"
              fontSize="6"
              fill="currentColor"
              className="text-yellow-500 animate-spin"
            >
              ✨
            </text>
            <text
              x="18"
              y="16"
              fontSize="6"
              fill="currentColor"
              className="text-yellow-500 animate-spin"
              style={{ animationDelay: '0.5s' }}
            >
              ✨
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
