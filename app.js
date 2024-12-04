document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([49.8225, 19.0445], 11); // Widok na Bielsko-Białą
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    
    let userCoords = null; // Współrzędne użytkownika
    let routeControl = null; // Kontrola trasy
    let points = []; // Punkty do odwiedzenia
    let stepsVisible = true; // Zmienna przechowująca stan widoczności kroków
    let stepsToggleButton = null;
    let markers = []; // Tablica markerów, aby później sprawdzić dotarcie do punktu


    function startLocationTracking() {
        navigator.geolocation.watchPosition(
            (position) => {
                userCoords = [position.coords.latitude, position.coords.longitude];
                console.log('Aktualna lokalizacja:', userCoords); // Debugowanie
                map.setView(userCoords, 13); // Ustaw widok mapy na nową lokalizację
            },
            (error) => {
                console.error("Nie udało się uzyskać lokalizacji.", error);
                alert("Twoja lokalizacja nie jest dostępna.");
            },
            {
                enableHighAccuracy: true, // Włącz dokładne śledzenie lokalizacji
                maximumAge: 0, // Nie używaj zapisanej lokalizacji
                timeout: 5000 // Ustaw czas oczekiwania na odpowiedź
            }
        );
    }

// Uruchomienie funkcji śledzenia lokalizacji
startLocationTracking();
//załadowanie punktów na mapę
loadPoints();


    // Dodanie kontrolki lokalizacji użytkownika do mapy
    L.control.locate({
        position: 'topright', // Pozycja kontrolki w prawym górnym rogu
        strings: { title: "Pokaż moją lokalizację" }, // Tekst wyświetlany na przycisku
        follow: true,
        locateOptions: {
            enableHighAccuracy: true, // Wysoka dokładność
            maximumAge: 10000, // Maksymalny wiek lokalizacji, po którym będzie ponownie pobrana
            timeout: 10000 // Czas oczekiwania na odpowiedź
        },
        onLocationFound: function(e) {
            console.log('Aktualna lokalizacja:', e.latlng); // Wypisz lokalizację w konsoli
        }
    }).addTo(map);

    // Funkcja do teleportacji
    function teleportTo(coords) {
        userCoords = coords; // Zaktualizuj współrzędne użytkownika
        map.setView(coords, 13); // Skup mapę na nowych współrzędnych
        console.log(`Teleportowano do: ${coords[0]}, ${coords[1]}`);
        console.log(`współrzędne gracza: ${userCoords}`)
    }

    // Funkcja do rysowania trasy
    function drawRoute(destinationCoords) {
        if (!userCoords) {
            alert("Twoja lokalizacja nie jest dostępna.");
            return;
        }

        // Usuń istniejącą trasę, jeśli istnieje
        if (routeControl) {
            map.removeControl(routeControl);
        }

        // Utwórz nową trasę
        routeControl = L.Routing.control({
            waypoints: [
                L.latLng(userCoords),
                L.latLng(destinationCoords)
            ],
            routeWhileDragging: false,
            createMarker: () => null,   
            show: true, // Ukrywa instrukcje
            routePopup: false, // Ukrywa popup z instrukcjami po wyznaczeniu trasy     
        }).addTo(map);

        // Wyświetl przycisk przełączania kroków tylko po narysowaniu trasy
        if (!stepsToggleButton) {
            showToggleButton(); // Jeśli nie, wywołujemy funkcję do dodania przycisku
    }
}

    // Funkcja do ładowania punktów
    function loadPoints() {
        fetch('points.json')
            .then(response => response.json())
            .then(data => {
                points = data;
                console.log('Punkty załadowane:', points); // Debugowanie, sprawdzanie danych
                data.forEach((point, index) => {
                    const marker = L.marker(point.coordinates).addTo(map);
                    marker.bindPopup(`
                        <b>${point.name}</b>
                        <p>${point.description}</p>
                        <a href="#" class="route-button" data-index="${index}">Wyznacz trasę</a>
                        <a href="#" class="teleport-button" data-index="${index}">Teleportuj</a>
                    `);

                    // Obsługa kliknięcia przycisku "Wyznacz trasę"
                    marker.on('popupopen', () => {
                        const routeButton = marker.getPopup().getElement().querySelector('.route-button');
                        const teleportButton = marker.getPopup().getElement().querySelector('.teleport-button');

                        if (routeButton) {
                            routeButton.addEventListener('click', (e) => {
                                e.preventDefault();
                                const pointIndex = routeButton.getAttribute('data-index');
                                const destinationCoords = points[pointIndex].coordinates;
                                drawRoute(destinationCoords);
                            });
                        }

                        if (teleportButton) {
                            teleportButton.addEventListener('click', (e) => {
                                e.preventDefault();
                                const pointIndex = teleportButton.getAttribute('data-index');
                                const teleportCoords = points[pointIndex].coordinates;
                                teleportTo(teleportCoords);
                            });
                        }
                    });
                });
            })
            .catch(error => console.error('Błąd podczas ładowania punktów:', error));
    }

    // Funkcja do przełączania widoczności kroków
    function showToggleButton() {
        stepsToggleButton = L.control({ position: 'topright' });

        stepsToggleButton.onAdd = function () {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            
            // Ustalamy tekst przycisku w zależności od stanu
            div.innerHTML = stepsVisible ? 'Wyłącz kroki' : 'Włącz kroki';
            
            div.style.backgroundColor = 'white';
            div.style.padding = '5px';
            div.style.cursor = 'pointer';

            // Akcja kliknięcia przycisku
            div.onclick = () => {
                const routingContainer = document.querySelector('.leaflet-routing-container');
                if (routingContainer) {
                    if (stepsVisible) {
                        routingContainer.style.display = 'none'; // Ukryj kroki
                        div.innerHTML = 'Włącz kroki'; // Zmieniamy tekst na przycisku
                        stepsVisible = false;
                    } else {
                        routingContainer.style.display = 'block'; // Pokaż kroki
                        div.innerHTML = 'Wyłącz kroki'; // Zmieniamy tekst na przycisku
                        stepsVisible = true;
                    }
                }
            };

            return div;
        };

        // Dodaj przycisk do mapy, jeśli trasa jest aktywna
        stepsToggleButton.addTo(map);
    }

  

// Funkcja do sprawdzania, czy użytkownik dotarł do punktu
function checkArrival() {
    if (!userCoords || points.length === 0) return;

    points.forEach((point) => {
        const distance = getDistance(userCoords, point.coordinates);

        if (distance < 100) { // Jeżeli użytkownik jest w odległości 100 metrów od punktu
            showPointDescription(point); // Funkcja do wyświetlenia opisu punktu
            marker = L.marker(point.coordinates).addTo(map); // Dodanie markera dla punktu
            marker.bindPopup(`
                <b>${point.name}</b>
                <p>${point.description}</p>
            `).openPopup(); // Otwarcie popup
        }
    });
}


// Funkcja do obliczania odległości między dwoma punktami (w metrach)
function getDistance(coords1, coords2) {
    const R = 6371e3; // Promień Ziemi w metrach
    const lat1 = coords1[0] * Math.PI / 180;
    const lat2 = coords2[0] * Math.PI / 180;
    const deltaLat = (coords2[0] - coords1[0]) * Math.PI / 180;
    const deltaLon = (coords2[1] - coords1[1]) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // W wyniku dostajemy odległość w metrach
    return distance;
}

// Funkcja do wyświetlania opisu punktu
function showPointDescription(point) {
    const descriptionContainer = document.getElementById('point-description');
    if (descriptionContainer) {
        descriptionContainer.innerHTML = `  
            <h3>${point.name}</h3>
            <p>${point.description}</p>
        `;
    }
}

// Ustawienie interwału do sprawdzania, czy użytkownik dotarł do punktu
setInterval(checkArrival, 5000); // Sprawdzaj co 5 sekund



    

});
