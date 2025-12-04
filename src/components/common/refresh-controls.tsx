'use client';

import { Clock, RefreshCw } from 'lucide-react';
import React, { startTransition, useEffect, useOptimistic, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RefreshControlsProps {
  isLoading: boolean;
  autoRefresh: boolean;
  nextRefreshTime: Date | null;
  onRefresh: () => void;
  onAutoRefreshChange: (enabled: boolean) => void;
}

// Компонент с использованием useOptimistic (React 19.3+)
function RefreshControlsBase({
  isLoading,
  autoRefresh,
  nextRefreshTime,
  onRefresh,
  onAutoRefreshChange,
}: RefreshControlsProps) {
  // Оптимистическое состояние для мгновенного обновления UI
  const [optimisticAutoRefresh, setOptimisticAutoRefresh] = useOptimistic(
    autoRefresh,
    (_state, newValue: boolean) => newValue
  );

  // Внутреннее состояние для отображения таймера
  const [timeDisplay, setTimeDisplay] = useState('5:00');

  // Ref для хранения интервала
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Эффект для управления таймером внутри компонента
  useEffect(() => {
    // Очистка предыдущего таймера
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Если автообновление выключено или нет даты
    if (!optimisticAutoRefresh || !nextRefreshTime) {
      setTimeDisplay('5:00');
      return;
    }

    // Функция обновления отображаемого времени
    const updateTimeDisplay = () => {
      const now = new Date();
      const diff = Math.max(0, nextRefreshTime.getTime() - now.getTime());

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setTimeDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    // Обновляем сразу
    updateTimeDisplay();

    // Обновляем каждую секунду
    timerRef.current = setInterval(updateTimeDisplay, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [optimisticAutoRefresh, nextRefreshTime]);

  // Обработчик переключения состояния автообновления с оптимистическими обновлениями
  const toggleAutoRefresh = () => {
    // Оборачиваем оптимистическое обновление в startTransition
    startTransition(() => {
      setOptimisticAutoRefresh(!optimisticAutoRefresh);
    });
    // Отправляем запрос на сервер
    onAutoRefreshChange(!optimisticAutoRefresh);
  };

  // Получаем текст для кнопки
  const buttonText = optimisticAutoRefresh ? `Auto: ${timeDisplay}` : 'Auto Off';

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={onRefresh}
        disabled={isLoading}
        title="Refresh data now"
      >
        <RefreshCw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
        <span className="sr-only">Refresh</span>
      </Button>

      <Button
        variant={optimisticAutoRefresh ? 'default' : 'outline'}
        size="sm"
        className="gap-1 h-9 px-3 min-w-28"
        onClick={toggleAutoRefresh}
        title={
          optimisticAutoRefresh
            ? 'Disable auto-refresh'
            : 'Enable auto-refresh (refreshes every 5 minutes)'
        }
      >
        <Clock className="h-4 w-4" />
        <span className={cn('whitespace-nowrap', optimisticAutoRefresh && 'font-mono')}>
          {buttonText}
        </span>
      </Button>
    </div>
  );
}

// Экспортируем мемоизированную версию компонента (React 19.3+ с useOptimistic)
export const RefreshControls = React.memo(RefreshControlsBase);
