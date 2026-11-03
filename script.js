const ourCoords = { latitude: 48.94321, longitude: 24.73380 };
let destinationCoords = { latitude: ourCoords.latitude, longitude: ourCoords.longitude };
let currentCoords = null;
let previousCoords = null;
let watchId = null;
let map = null;
let destinationMarker = null;

const locationOutput = document.getElementById('location');
const accuracyOutput = document.getElementById('accuracy');
const timeOutput = document.getElementById('locationTime');
const distanceOutput = document.getElementById('distance');
const statusOutput = document.getElementById('status');
const mapMessage = document.getElementById('mapMessage');
const locationButton = document.getElementById('locationButton');
const watchButton = document.getElementById('watchButton');
const clearWatchButton = document.getElementById('clearWatchButton');
const destinationForm = document.getElementById('destinationForm');
const latitudeInput = document.getElementById('destinationLatitude');
const longitudeInput = document.getElementById('destinationLongitude');
const destinationMessage = document.getElementById('destinationMessage');
const destinationDistance = document.getElementById('destinationDistance');

const options = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0
};

// 1.
function createMap() {
    if (typeof L === 'undefined') {
        mapMessage.textContent = 'Не вдалося завантажити Leaflet. Перевір Інтернет і онови сторінку.';
        mapMessage.classList.add('error');
        return;
    }

    map = L.map('map').setView([ourCoords.latitude, ourCoords.longitude], 13);

    let tiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; <a href="https://www.arcgis.com/home/item.html?id=3b93337983e9436f8db950e38a8629af">Esri</a> &mdash; Esri and GIS User Community'
    }).addTo(map);

    tiles.on('tileerror', function () {
        mapMessage.textContent = 'Не вдалося завантажити зображення карти. Перевір Інтернет і відкрий сторінку через Live Server (localhost).';
        mapMessage.classList.add('error');
    });

    destinationMarker = L.marker([ourCoords.latitude, ourCoords.longitude])
        .addTo(map)
        .bindPopup('Коледж (початковий пункт призначення)');
}

// 2. 
function canLocate() {
    if (!window.isSecureContext) {
        statusOutput.textContent = 'Для геолокації відкрий сторінку через localhost або HTTPS.';
        return false;
    }
    if (!navigator.geolocation) {
        statusOutput.textContent = 'Цей браузер не підтримує Geolocation.';
        return false;
    }
    return true;
}

function getMyLocation() {
    if (!canLocate()) return;

    locationButton.disabled = true;
    watchButton.disabled = true;
    statusOutput.textContent = 'Визначаємо координати... Дозволь браузеру доступ до місцезнаходження.';

    navigator.geolocation.getCurrentPosition(function (position) {
        locationButton.disabled = false;
        watchButton.disabled = false;
        displayLocation(position);
    }, function (error) {
        locationButton.disabled = false;
        watchButton.disabled = false;
        displayError(error);
    }, options);
}

function displayLocation(position) {
    let latitude = position.coords.latitude;
    let longitude = position.coords.longitude;
    let time = new Date(position.timestamp).toLocaleString('uk-UA');

    currentCoords = { latitude: latitude, longitude: longitude };
    locationOutput.textContent = `Широта: ${latitude.toFixed(6)}; довгота: ${longitude.toFixed(6)}`;
    accuracyOutput.textContent = `Точність: ${position.coords.accuracy.toFixed(1)} м`;
    timeOutput.textContent = `Час визначення: ${time}`;
    distanceOutput.textContent = `Відстань до коледжу: ${computeDistance(currentCoords, ourCoords).toFixed(3)} км`;
    updateDestinationDistance();
    statusOutput.textContent = watchId !== null ? 'Стеження увімкнено. Координати оновлено.' : 'Координати визначено. Стеження вимкнено.';

    if (map && (previousCoords === null || previousCoords.latitude !== latitude || previousCoords.longitude !== longitude)) {
        L.marker([latitude, longitude]).addTo(map)
            .bindPopup(`Моє місцезнаходження<br>Широта: ${latitude.toFixed(6)}<br>Довгота: ${longitude.toFixed(6)}<br>Час: ${time}`)
            .openPopup();
        map.setView([latitude, longitude], 15);
        previousCoords = { latitude: latitude, longitude: longitude };
    }
}

function displayError(error) {
    const errors = {
        1: 'Доступ до геолокації заборонено. Дозволь його в налаштуваннях сайту та спробуй ще раз.',
        2: 'Місцезнаходження недоступне. Перевір служби геолокації та підключення до мережі.',
        3: 'Час очікування вичерпано. Спробуй визначити координати ще раз.'
    };
    statusOutput.textContent = errors[error.code] || 'Невідома помилка визначення місцезнаходження.';
}

// 3. 
function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}

function computeDistance(startCoords, destCoords) {
    let radius = 6371;
    let startLat = degreesToRadians(startCoords.latitude);
    let destLat = degreesToRadians(destCoords.latitude);
    let deltaLat = degreesToRadians(destCoords.latitude - startCoords.latitude);
    let deltaLon = degreesToRadians(destCoords.longitude - startCoords.longitude);

    let a = Math.sin(deltaLat / 2) ** 2 +
        Math.cos(startLat) * Math.cos(destLat) * Math.sin(deltaLon / 2) ** 2;

    a = Math.max(0, Math.min(1, a));
    return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 4.
function watchLocation() {
    if (!canLocate() || watchId !== null) return;

    watchId = navigator.geolocation.watchPosition(function (position) {
        if (watchId !== null) displayLocation(position);
    }, function (error) {
        if (watchId === null) return;
        clearWatch();
        displayError(error);
    }, options);

    watchButton.disabled = true;
    locationButton.disabled = true;
    clearWatchButton.disabled = false;
    statusOutput.textContent = 'Стеження увімкнено. Очікуємо координати...';
}

function clearWatch() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    watchButton.disabled = false;
    locationButton.disabled = false;
    clearWatchButton.disabled = true;
    statusOutput.textContent = 'Стеження зупинено. Попередні маркери залишилися на карті.';
}

// 5. 
function updateDestinationDistance() {
    if (currentCoords === null) return;
    destinationDistance.textContent = `Відстань до пункту призначення: ${computeDistance(currentCoords, destinationCoords).toFixed(3)} км`;
}

function showDestination(event) {
    event.preventDefault();

    let latitude = Number(latitudeInput.value);
    let longitude = Number(longitudeInput.value);

    if (latitudeInput.value.trim() === '' || longitudeInput.value.trim() === '' ||
        !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        destinationMessage.textContent = 'Введи широту від -90 до 90 та довготу від -180 до 180. Обидва поля обов’язкові.';
        destinationMessage.classList.add('error');
        return;
    }

    destinationCoords = { latitude: latitude, longitude: longitude };
    destinationMessage.classList.remove('error');
    destinationMessage.textContent = `Пункт призначення: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    updateDestinationDistance();

    if (map) {
        destinationMarker.setLatLng([latitude, longitude])
            .bindPopup(`Пункт призначення<br>Широта: ${latitude}<br>Довгота: ${longitude}`)
            .openPopup();
        map.setView([latitude, longitude], 15);
        document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

locationButton.addEventListener('click', getMyLocation);
watchButton.addEventListener('click', watchLocation);
clearWatchButton.addEventListener('click', clearWatch);
destinationForm.addEventListener('submit', showDestination);

createMap();
getMyLocation();
