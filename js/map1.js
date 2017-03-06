ymaps.ready(function () {

    // Координаты, к которым будем строить маршруты.
    //
    //
    //
    // Укажите здесь, к примеру, координаты вашего офиса.
    var targetCoords = [55.744564, 37.624559],
        
  
    

    // Инициализируем карту.
        myMap = new ymaps.Map('map', {
            center: targetCoords,
            zoom: 14
        }, {
            // Ограничиваем количество результатов поиска.
            searchControlResults: 1,

            // Отменяем автоцентрирование к найденным адресам.
            searchControlNoCentering: true,

            // Разрешаем кнопкам нужную длину.
            buttonMaxWidth: 150
        }),

    // Метка для конечной точки маршрута.
        targetPoint = new ymaps.Placemark(targetCoords, {iconImageSize: [64, 64], // размер иконки
	iconImageOffset: [-32, -64], // позиция иконки
	balloonContentSize: [270, 99], // размер нашего кастомного балуна в пикселях
   iconImageHref: 'https://raw.githubusercontent.com/domservis/domservis.github.io/master/images/258.png', iconContent: 'БЛИЖАЙШИЙ МАСТЕР',    balloonContentHeader: "ВЫЗОВ/ЗВОНОК",
            balloonContentBody: "- Одна Информация<br>- Другая Информация",
            balloonContentFooter: "+/-",
            hintContent: "БЛИЖАЙШИЙ МАСТЕР",
            balloonLayout: "default#imageWithContent"},
     //   { preset: 'islands#redStretchyIcon' },
                                          { iconLayout: 'default#image',
          iconImageHref: 'https://raw.githubusercontent.com/domservis/domservis.github.io/master/images/258.png',
          iconImageSize: [80, 80],
          
          iconImageOffset: [-20, -47],
          iconContent: 'ближайший мастер'})  ,

    // Получаем ссылки на нужные элементы управления.
        searchControl = myMap.controls.get('searchControl'),
        geolocationControl = myMap.controls.get('geolocationControl'),

    // Создаём выпадающий список для выбора типа маршрута.
        routeTypeSelector = new ymaps.control.ListBox({
            data: {
                content: 'Маршрут до Вас'
            },
            items: [
                new ymaps.control.ListBoxItem('На автомобиле'),
                new ymaps.control.ListBoxItem('Общественным транспортом'),
                new ymaps.control.ListBoxItem('Пешком')
            ],
            options: {
                itemSelectOnClick: false
            }
        }),
    // Получаем прямые ссылки на пункты списка.
        autoRouteItem = routeTypeSelector.get(0),
        masstransitRouteItem = routeTypeSelector.get(1),
        pedestrianRouteItem = routeTypeSelector.get(2),

    // Метка для начальной точки маршрута.
        sourcePoint,

    // Переменные, в которых будут храниться ссылки на текущий маршрут.
        currentRoute,
        currentRoutingMode;

    // Добавляем конечную точку на карту.
    myMap.geoObjects.add(targetPoint);

    // Добавляем на карту созданный выпадающий список.
    myMap.controls.add(routeTypeSelector);

    // Подписываемся на события нажатия на пункты выпадающего списка.
    autoRouteItem.events.add('click', function (e) { createRoute('auto', e.get('target')); });
    masstransitRouteItem.events.add('click', function (e) { createRoute('masstransit', e.get('target')); });
    pedestrianRouteItem.events.add('click', function (e) { createRoute('pedestrian', e.get('target')); });

    // Подписываемся на события, информирующие о трёх типах выбора начальной точки маршрута:
    // клик по карте, отображение результата поиска или геолокация.
    myMap.events.add('click', onMapClick);
    searchControl.events.add('resultshow', onSearchShow);
    geolocationControl.events.add('locationchange', onGeolocate);

    /*
     * Следующие функции реагируют на нужные события, удаляют с карты предыдущие результаты,
     * переопределяют точку отправления и инициируют перестроение маршрута.
     */

    function onMapClick (e) {
        clearSourcePoint();
        sourcePoint = new ymaps.Placemark(e.get('coords'), { iconContent: 'Я ТУТ' }, { preset: 'islands#greenStretchyIcon' });
        myMap.geoObjects.add(sourcePoint);
        createRoute();
    }

    function onSearchShow (e) {
        clearSourcePoint(true);
        sourcePoint = searchControl.getResultsArray()[e.get('index')];
        createRoute();
    }

    function onGeolocate (e) {
        clearSourcePoint();
        sourcePoint = e.get('geoObjects').get(0);
        createRoute();
    }

    function clearSourcePoint (keepSearchResult) {
        if (!keepSearchResult) {
            searchControl.hideResult();
        }

        if (sourcePoint) {
            myMap.geoObjects.remove(sourcePoint);
            sourcePoint = null;
        }
    }

    /*
     * Функция, создающая маршрут.
     */
    function createRoute (routingMode, targetBtn) {
        // Если `routingMode` был передан, значит вызов происходит по клику на пункте выбора типа маршрута,
        // следовательно снимаем выделение с другого пункта, отмечаем текущий пункт и закрываем список.
        // В противном случае — перестраиваем уже имеющийся маршрут или ничего не делаем.
        if (routingMode) {
            if (routingMode == 'auto') {
                masstransitRouteItem.deselect();
                pedestrianRouteItem.deselect();
            } else if (routingMode == 'masstransit') {
                autoRouteItem.deselect();
                pedestrianRouteItem.deselect();
            } else if (routingMode == 'pedestrian') {
                autoRouteItem.deselect();
                masstransitRouteItem.deselect();
            }

            targetBtn.select();
            routeTypeSelector.collapse();
        } else if (currentRoutingMode) {
            routingMode = currentRoutingMode;
        } else {
            return;
        }

        // Если начальная точка маршрута еще не выбрана, ничего не делаем.
        if (!sourcePoint) {
            currentRoutingMode = routingMode;
            geolocationControl.events.fire('press');
            return;
        }

        // Стираем предыдущий маршрут.
        clearRoute();

        currentRoutingMode = routingMode;

        // Создаём маршрут нужного типа из начальной в конечную точку.
        currentRoute = new ymaps.multiRouter.MultiRoute({
            referencePoints: [sourcePoint, targetPoint],
            params: { routingMode: routingMode }
        }, {
            boundsAutoApply: true
        });

        // Добавляем маршрут на карту.
        myMap.geoObjects.add(currentRoute);
    }

    function clearRoute () {
        myMap.geoObjects.remove(currentRoute);
        currentRoute = currentRoutingMode = null;
    }
});

  var myBalloonLayout = ymaps.templateLayoutFactory.createClass(
                '<h3>$[properties.name]</h3>' +
                '<p><strong>Адрес:</strong> $[properties.address]</p>' +
                '<p><strong>Веб-сайт:</strong> <a rel="nofollow" href="http://$[properties.websayt]" target="_blank">перейти</a></p>'
            );
