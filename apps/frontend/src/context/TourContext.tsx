import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export type TourRole = 'admin' | 'employee' | 'owner'

export interface TourStep {
  selector?: string        // [data-tour="value"] — omit for centered modal step
  route?: string           // navigate here before showing step
  title: string
  body: string
  align?: 'top' | 'bottom' | 'left' | 'right'  // preferred tooltip side
  clickBefore?: string     // data-tour value to click before showing step (e.g. open modal)
  delay?: number           // extra ms to wait after clickBefore/navigation
}

const STEPS: Record<TourRole, TourStep[]> = {
  admin: [
    {
      title: 'Добро пожаловать в Pet Hotel! 🐾',
      body: 'Этот короткий тур покажет основные функции системы. Используйте кнопки «Далее» и «Назад» для навигации.',
    },
    {
      route: '/admin/stays',
      selector: 'stays-view-toggle',
      title: 'Заселения',
      body: 'Главный раздел системы. Переключайтесь между таблицей и календарным Gantt-видом для наглядной визуализации занятости клеток.',
      align: 'bottom',
    },
    {
      route: '/admin/stays',
      selector: 'stays-checkin-btn',
      title: 'Заселить питомца',
      body: 'Эта кнопка открывает форму заселения. Нажмём «Далее» — и тур откроет её автоматически, покажет каждое поле.',
      align: 'bottom',
    },
    {
      route: '/admin/stays',
      selector: 'modal-pet-select',
      clickBefore: 'stays-checkin-btn',
      delay: 500,
      title: 'Выбор питомца',
      body: 'Начните вводить имя — появится поиск по всем питомцам. Если питомец ещё не зарегистрирован, нажмите «+» рядом — создайте прямо здесь вместе с владельцем.',
      align: 'bottom',
    },
    {
      route: '/admin/stays',
      selector: 'modal-cage-select',
      title: 'Выбор клетки',
      body: 'Отображаются только свободные клетки. Видно номер, зону и тип (собаки / кошки / другие). Занятые клетки не показываются.',
      align: 'bottom',
    },
    {
      route: '/admin/stays',
      selector: 'modal-employee-select',
      title: 'Ответственный сотрудник',
      body: 'Выберите сотрудника который будет вести этого питомца и заполнять ежедневные отчёты. Сотрудник увидит питомца в своём разделе «Постояльцы».',
      align: 'bottom',
    },
    {
      route: '/admin/stays',
      selector: 'modal-planned-checkout',
      title: 'Планируемый выезд',
      body: 'Необязательное поле. Если известна дата выезда — укажите её: она отобразится в таблице и в календарном Gantt-виде для планирования загрузки.',
      align: 'top',
    },
    {
      route: '/admin/stays',
      selector: 'modal-save-btn',
      title: 'Подтвердить заселение',
      body: 'Всё готово! Нажмите «Заселить» для подтверждения. Клетка перейдёт в статус «Занята», питомец появится у сотрудника в разделе постояльцев.',
      align: 'top',
    },
    {
      route: '/admin/reports',
      selector: 'reports-list',
      title: 'Отчёты сотрудников',
      body: 'Ежедневные отчёты о каждом питомце. Разворачивайте карточку чтобы увидеть метрики, наблюдения и фото. Красный индикатор ⚠ означает тревогу.',
      align: 'top',
    },
    {
      route: '/admin/stats',
      selector: 'stats-occupancy',
      title: 'Аналитика',
      body: 'График занятости клеток за выбранный период. Выбирайте 7, 14, 30 или 90 дней. Внизу — топ владельцев по количеству заселений.',
      align: 'bottom',
    },
    {
      route: '/admin/users',
      selector: 'users-table',
      title: 'Пользователи',
      body: 'Управление всеми пользователями: сотрудники, владельцы, администраторы. Можно фильтровать по роли и искать по имени или email.',
      align: 'top',
    },
    {
      route: '/admin/cages',
      selector: 'cages-table',
      title: 'Клетки',
      body: 'Список всех клеток отеля. Добавляйте новые, редактируйте зоны и типы. QR-код на каждую клетку — для мгновенного доступа сотрудника к постояльцу.',
      align: 'top',
    },
    {
      route: '/settings',
      selector: 'settings-whatsapp',
      title: 'WhatsApp уведомления',
      body: 'Редактируйте шаблон сообщения, которое сотрудник отправляет владельцу после заполнения отчёта. Переменные {petName}, {date}, {url} подставляются автоматически.',
      align: 'top',
    },
    {
      title: 'Вы готовы! 🎉',
      body: 'Это все основные функции системы. Если понадобится помощь — нажмите кнопку «?» в настройках снова. Удачной работы!',
    },
  ],

  employee: [
    {
      title: 'Добро пожаловать! 🐾',
      body: 'Ваша главная задача — заполнять ежедневные отчёты по каждому питомцу. Этот тур покажет как это делается.',
    },
    {
      route: '/employee/stays',
      selector: 'employee-checkin-btn',
      title: 'Заселить питомца',
      body: 'Нажмите эту кнопку чтобы заселить нового питомца. Выберите питомца и свободную клетку — всё готово. Можно создать питомца и владельца прямо здесь.',
      align: 'bottom',
    },
    {
      route: '/employee/stays',
      selector: 'employee-stays-list',
      title: 'Ваши постояльцы',
      body: 'Здесь все питомцы на вашем попечении. Карточка показывает имя, вид, клетку и дату заезда. Цветная точка — статус из последнего отчёта.',
      align: 'top',
    },
    {
      route: '/employee/stays',
      selector: 'employee-report-btn',
      title: 'Заполнить отчёт',
      body: 'Нажимайте эту кнопку каждый день для каждого питомца. После заполнения кнопка станет неактивной — значит отчёт уже есть.',
      align: 'top',
    },
    {
      route: '/employee/stays',
      selector: 'employee-notes-btn',
      title: 'Быстрые заметки',
      body: 'Короткие внутренние заметки без полного отчёта. Удобно для оперативных пометок которые нужно передать коллеге.',
      align: 'top',
    },
    {
      route: '/employee/reports',
      selector: 'employee-reports-list',
      title: 'История отчётов',
      body: 'Все ваши отчёты за все время. Можно найти нужный день и питомца через поиск.',
      align: 'top',
    },
    {
      title: 'Вы готовы! 🎉',
      body: 'Главное правило: один отчёт в день на каждого питомца. Владельцы получают уведомление в WhatsApp. Удачной смены!',
    },
  ],

  owner: [
    {
      title: 'Добро пожаловать! 🐾',
      body: 'В этом личном кабинете вы можете следить за своими питомцами которые проживают в нашем отеле.',
    },
    {
      route: '/owner/pets',
      selector: 'owner-pets-grid',
      title: 'Ваши питомцы',
      body: 'Все ваши питомцы. Карточка показывает вид, породу и фото. Нажмите «Отчёты» чтобы посмотреть историю проживания.',
      align: 'top',
    },
    {
      route: '/owner/stays',
      selector: 'owner-stays-list',
      title: 'Заселения',
      body: 'Активные и прошедшие заселения ваших питомцев. Видите в какой клетке находится питомец и с какого числа.',
      align: 'top',
    },
    {
      route: '/owner/reports',
      selector: 'owner-reports-list',
      title: 'Ежедневные отчёты',
      body: 'Сотрудники заполняют отчёт каждый день. Разворачивайте карточку чтобы видеть метрики, наблюдения и фото вашего питомца.',
      align: 'top',
    },
    {
      title: 'Всё готово! 🎉',
      body: 'Вы будете получать уведомление в WhatsApp когда выйдет новый отчёт. Если есть вопросы — свяжитесь с администратором отеля.',
    },
  ],
}

interface TourContextType {
  active: boolean
  stepIndex: number
  totalSteps: number
  currentStep: TourStep | null
  start: (role: TourRole) => void
  next: () => void
  prev: () => void
  stop: () => void
}

const TourContext = createContext<TourContextType | null>(null)

export function TourProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [active, setActive] = useState(false)
  const [role, setRole] = useState<TourRole>('employee')
  const [stepIndex, setStepIndex] = useState(0)
  const pendingStepRef = useRef<number | null>(null)

  const steps = STEPS[role]
  const currentStep = active ? steps[stepIndex] : null

  // After navigation, advance to pending step
  useEffect(() => {
    if (pendingStepRef.current !== null) {
      const idx = pendingStepRef.current
      pendingStepRef.current = null
      // Small delay to let the page render
      setTimeout(() => setStepIndex(idx), 350)
    }
  }, [location.pathname])

  const goToStep = useCallback((idx: number, stepsArr: TourStep[]) => {
    const step = stepsArr[idx]
    if (!step) return
    if (step.route && step.route !== location.pathname) {
      pendingStepRef.current = idx
      navigate(step.route)
    } else {
      setStepIndex(idx)
    }
  }, [location.pathname, navigate])

  const start = useCallback((r: TourRole) => {
    setRole(r)
    setStepIndex(0)
    setActive(true)
    pendingStepRef.current = null
  }, [])

  const next = useCallback(() => {
    const nextIdx = stepIndex + 1
    if (nextIdx >= steps.length) { setActive(false); return }
    goToStep(nextIdx, steps)
  }, [stepIndex, steps, goToStep])

  const prev = useCallback(() => {
    const prevIdx = stepIndex - 1
    if (prevIdx < 0) return
    goToStep(prevIdx, steps)
  }, [stepIndex, steps, goToStep])

  const stop = useCallback(() => {
    setActive(false)
    pendingStepRef.current = null
  }, [])

  return (
    <TourContext.Provider value={{ active, stepIndex, totalSteps: steps.length, currentStep, start, next, prev, stop }}>
      {children}
    </TourContext.Provider>
  )
}

export function useTour() {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useTour must be used inside TourProvider')
  return ctx
}
