'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RefreshControlsProps {
  isLoading: boolean;
  autoRefresh: boolean;
  nextRefreshTime: Date | null; // Получаем время следующего обновления вместо готового таймера
  onRefresh: () => void;
  onAutoRefreshChange: (enabled: boolean) => void;
}

// Компонент с внутренним таймером
function RefreshControlsBase({
  isLoading,
  autoRefresh,
  nextRefreshTime,
  onRefresh,
  onAutoRefreshChange,
}: RefreshControlsProps) {
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
    if (!autoRefresh || !nextRefreshTime) {
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
  }, [autoRefresh, nextRefreshTime]);

  // Обработчик переключения состояния автообновления
  const toggleAutoRefresh = useCallback(() => {
    onAutoRefreshChange(!autoRefresh);
  }, [autoRefresh, onAutoRefreshChange]);

  // Получаем текст для кнопки
  const buttonText = autoRefresh ? `Auto: ${timeDisplay}` : 'Auto Off';

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
        variant={autoRefresh ? 'default' : 'outline'}
        size="sm"
        className="gap-1 h-9 px-3 min-w-28"
        onClick={toggleAutoRefresh}
        title={
          autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh (refreshes every 5 minutes)'
        }
      >
        <Clock className="h-4 w-4" />
        <span className={cn('whitespace-nowrap', autoRefresh && 'font-mono')}>{buttonText}</span>
      </Button>
    </div>
  );
}

// Экспортируем мемоизированную версию компонента
export const RefreshControls = React.memo(RefreshControlsBase);
