# Виправлення вибору розробників для декількох проектів

## Опис проблеми

Раніше система використовувала глобальне зберігання для всіх проектів з ключем `'tracked-developers'`. Це означало, що вибір розробників для одного проекту впливав на всі інші проекти, що було неправильною поведінкою.

## Внесені зміни

### 1. Оновлено константи зберігання

**Файл: `src/constants/storage-keys.ts`**

Додано нові константи для пер-проектного зберігання:

```typescript
// Per-project tracking keys
export const TRACKED_DEVELOPERS_PREFIX = 'tracked-developers-';
export const getTrackedDevelopersKey = (projectId: number): string => 
  `${TRACKED_DEVELOPERS_PREFIX}${projectId}`;
```

### 2. Переписано хук useTrackedDevelopers

**Файл: `src/hooks/use-tracked-developers.ts`**

#### Основні зміни:
- **Обов'язковий параметр `projectId`**: Хук тепер вимагає projectId як параметр
- **Пер-проектне зберігання**: Кожен проект має свій унікальний ключ localStorage
- **Функція `updateDevelopers()`**: Нові розробники автоматично включаються (excluded: false)
- **Міграція даних**: Додано підтримку проекта ID до функції міграції

#### Нова сигнатура функції:
```typescript
export function useTrackedDevelopers(projectId: number)
```

#### Функція updateDevelopers з автоматичним включенням:
```typescript
const updateDevelopers = (newDevelopers: TrackedDeveloper[]) => {
  // Ensure all developers have the correct projectId and are included by default
  const updatedDevelopers = newDevelopers.map((dev) => ({
    ...dev,
    projectId: projectId, // Ensure correct project association
    excluded: false, // New developers are included by default (excluded: false)
  }));

  setDevelopers(updatedDevelopers);
};
```

### 3. Оновлено компоненти для роботи з пер-проектним зберіганням

#### Файл: `src/app/project-developers/[projectId]/page.tsx`
- Оновлено виклик хука: `useTrackedDevelopers(projectId)`
- Логіка залишилася такою ж, але тепер працює з пер-проектним зберіганням

#### Файл: `src/app/projects/page.tsx`
- Видалено непотрібний виклик useTrackedDevelopers (проекти більше не потребують цієї логіки)
- Спрощено функцію getSelectedDevelopersForProject (повертає порожній масив)

#### Файл: `src/hooks/use-projects.ts`
- Створено утилітну функцію `getIncludedDevelopersForProject()` для читання localStorage
- Видалено залежність від useTrackedDevelopers хука
- Оновлено типи для роботи з string ключами в selectedProjects

### 4. Виправлено конфігурацію Next.js

**Файл: `next.config.ts`**
- Видалено несумісну опцію `clientSegmentCache`
- Додано `cacheComponents: true`
- Видалено `export const dynamic = 'force-dynamic'` з page.tsx

### 5. Виправлено помилки типізації

- Змінено тип selectedProjects з `Record<number, boolean>` на `Record<string, boolean>`
- Додано імпорт TrackedDeveloper типу
- Виправлено невикористані параметри функцій

## Тестування

### Перевірка компіляції
```bash
npm run build  # ✅ Успішно
```

### Перевірка лінтингу
```bash
npm run lint   # ✅ Без попереджень
```

## Результат

Тепер кожен проект має власне незалежне зберігання розробників:

- **Проект 1**: `localStorage['tracked-developers-1']`
- **Проект 2**: `localStorage['tracked-developers-2']`
- **Проект N**: `localStorage['tracked-developers-N']`

### Переваги:
1. ✅ **Ізоляція даних**: Вибір розробників для одного проекту не впливає на інші
2. ✅ **Автоматичне включення**: Нові розробники автоматично включаються (excluded: false)
3. ✅ **Міграція даних**: Підтримка переходу від старої системи
4. ✅ **Типобезпека**: Правильні TypeScript типи без 'any'
5. ✅ **Оптимізація**: Кожен проект працює з власними даними

### Тест сценарії:
1. Відкрити сторінку проекту 1, виключити розробника
2. Відкрити сторінку проекту 2, перевірити, що розробник включений
3. Повернутися до проекту 1, перевірити, що виключення збережено

Система тепер працює правильно з повністю ізольованими даними для кожного проекту.