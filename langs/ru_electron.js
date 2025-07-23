module.exports = (text) => {
  return text
    .replaceAll("Agora há pouco", "Только что")
    .replaceAll("em %s", "через %s")
    .replaceAll("há %s", "%s назад")
    .replaceAll(
      'sec:i(["%d segundo","%d de segundos","%d segundos"]),',
      'sec: i(["1 секунда", "%d секунды", "%d секунд"]),',
    )
    .replaceAll(
      'min:i(["%d minuto","%d de minutos","%d minutos"]),',
      'min: i(["1 минута", "%d минуты", "%d минут"]),',
    )
    .replaceAll(
      'hour:i(["%d hora","%d de horas","%d horas"]),',
      'hour: i(["1 час", "%d часа", "%d часов"]),',
    )
    .replaceAll(
      'day:i(["%d dia","%d de dias","%d dias"]),',
      'day: i(["1 день", "%d дня", "%d дней"]),',
    )
    .replaceAll(
      'month:i(["%d mês","%d de meses","%d meses"]),',
      'month: i(["1 месяц", "%d месяца", "%d месяцев"]),',
    )
    .replaceAll(
      'year:i(["%d ano","%d de anos","%d anos"])',
      'year: i(["1 год", "%d года", "%d лет"])',
    )
    .replaceAll(
      'secAbbreviated:i(["1 seg","%d seg","%d seg"]),',
      'secAbbreviated: i(["1 сек", "%d сек", "%d сек"]),',
    )
    .replaceAll(
      'minAbbreviated:i(["1 min","%d min","%d min"]),',
      'minAbbreviated: i(["1 мин", "%d мин", "%d мин"]),',
    )
    .replaceAll(
      'hourAbbreviated:i(["1 h","%d h","%d h"]),',
      'hourAbbreviated: i(["1 час", "%d часа", "%d часов"]),',
    )
    .replaceAll(
      'dayAbbreviated:i(["1 dia","%d dias","%d dias"]),',
      'dayAbbreviated: i(["1 день", "%d дня", "%d дней"]),',
    )
    .replaceAll(
      'monthAbbreviated:i(["1 mês","%d meses","%d meses"]),',
      'monthAbbreviated: i(["1 месяц", "%d месяца", "%d месяцев"]),',
    )
    .replaceAll(
      'yearAbbreviated:i(["1 ano","%d anos","%d anos"])',
      'yearAbbreviated: i(["1 год", "%d года", "%d лет"])',
    )
    .replaceAll(
      'months:["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"],',
      'months: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],',
    )
    .replaceAll(
      'monthsShort:["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"],',
      'monthsShort: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],',
    )
    .replaceAll(
      'weekdays:["Domingo","Segunda-Feira","Terça-Feira","Quarta-Feira","Quinta-Feira","Sexta-Feira","Sábado"],',
      'weekdays: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],',
    )
    .replaceAll(
      'shortWeekdays:["Sun" "Mon","Tue","Wed","Thu","Fri","Sat"],',
      'shortWeekdays: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],',
    )
    .replaceAll(
      'minWeekdays:["Su","Mo","Tu","We","Th","Fr","Sa"]',
      'shortWeekdays: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]',
    )
    .replaceAll('closeText:"Done",', 'closeText: "Готово",')
    .replaceAll('prevText:"Prev",', 'prevText: "Предыдущий",')
    .replaceAll('nextText:"Next",', "Следующий")
    .replaceAll('currentText:"Today",', 'currentText: "Сегодня",')
    .replaceAll('dateFormat:"dd/mm/yy",', 'dateFormat: "dd.mm.yy",')
    .replaceAll('closeText:"Fechar",', 'closeText: "Закрыть",')
    .replaceAll('prevText:"Anterior",', 'prevText: "Предыдущий",')
    .replaceAll('nextText:"Próximo",', 'prevText: "Следующий",')
    .replaceAll('currentText:"Hoje",', 'currentText: "Текущий",')
    .replaceAll(
      'sec:r(["1 segundo","%d segundos"]),',
      'sec: r(["1 секунда", "%d секунд"]),',
    )
    .replaceAll(
      'min:r(["1 minuto","%d minutos"]),',
      'min: r(["1 минута", "%d минут"]),',
    )
    .replaceAll(
      'hour:r(["1 hora","%d horas"]),',
      'hour: r(["1 час", "%d часов"]),',
    )
    .replaceAll('day:r(["1 dia","%d dias"]),', 'day: r(["1 день", "%d дней"]),')
    .replaceAll(
      'month:r(["1 mês","%d meses"]),',
      'month: r(["1 мес", "%d мес"]),',
    )
    .replaceAll('year:r(["1 ano","%d anos"])', 'year: r(["1 год", "%d лет"])');
};
