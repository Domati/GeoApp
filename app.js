document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([0, 0], 2); // Początkowy widok mapy
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    
    let userCoords = null; // Współrzędne użytkownika
    let routeControl = null; // Kontrola trasy
    let points = []; // Punkty do odwiedzenia

    // Funkcja do inicjalizacji mapy z lokalizacją użytkownika
    navigator.geolocation.getCurrentPosition(
        (position) => {
            userCoords = [position.coords.latitude, position.coords.longitude];
            console.log('Twoja lokalizacja:', userCoords); // Debugowanie
            map.setView(userCoords, 13);

            // Dodanie przycisku lokalizacji
            L.control.locate({
                position: 'topright',
                strings: { title: "Pokaż moją lokalizację" },
                locateOptions: { enableHighAccuracy: true }
            }).addTo(map);

            loadPoints(); // Ładowanie punktów
        },
        (error) => {
            console.error("Nie udało się uzyskać lokalizacji.", error);
            alert("Twoja lokalizacja nie jest dostępna.");
            map.setView([50.06143, 19.93658], 13); // Domyślny widok na Kraków
            loadPoints();
        }
    );

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
            routeWhileDragging: true,
            createMarker: () => null,          
        }).addTo(map);
    }

    // Funkcja do ładowania punktów
    function loadPoints() {
        fetch('points.json')
            .then(response => response.json())
            .then(data => {
                points = data;
                data.forEach((point, index) => {
                    const marker = L.marker(point.coordinates).addTo(map);
                    marker.bindPopup(`
                        <b>${point.name}</b>
                        <p>${point.description}</p>
                        <a href="#" class="route-button" data-index="${index}">Wyznacz trasę</a>
                    `);

                    // Obsługa kliknięcia przycisku "Wyznacz trasę"
                    marker.on('popupopen', () => {
                        // Usuwamy wcześniejsze nasłuchiwacze
                        const routeButton = marker.getPopup().getElement().querySelector('.route-button');
                        if (routeButton) {
                            routeButton.addEventListener('click', (e) => {
                                e.preventDefault();
                                const pointIndex = routeButton.getAttribute('data-index');
                                const destinationCoords = points[pointIndex].coordinates;
                                drawRoute(destinationCoords);
                            });
                        }
                    });
                });
            })
            .catch(error => console.error('Błąd podczas ładowania punktów:', error));
    }

});
