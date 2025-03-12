/**
 * Spotify API Integration for Pomidor
 * Allows users to connect Spotify and control music during work/break sessions
 */

class SpotifyController {
    constructor() {
        // Spotify API credentials
        this.clientId = '34865f399330400fac550894aaf887d6'; // TODO: Add your Spotify Client ID here
        this.redirectUri = window.location.origin + window.location.pathname;
        
        // State
        this.accessToken = null;
        this.refreshToken = null;
        this.expiresIn = 0;
        this.player = null;
        this.deviceId = null;
        this.isConnected = false;
        this.currentTrack = null;
        this.isPlaying = false;
        
        // Preferences
        this.workPlaylistId = localStorage.getItem('workPlaylistId') || null;
        this.breakPlaylistId = localStorage.getItem('breakPlaylistId') || null;
        this.workPlaylistName = localStorage.getItem('workPlaylistName') || 'None';
        this.breakPlaylistName = localStorage.getItem('breakPlaylistName') || 'None';
        this.autoPlay = localStorage.getItem('spotifyAutoPlay') === 'true';
        
        // UI Elements (will be initialized after DOM loads)
        this.elements = {};
        
        // Initialize
        this.init();
    }
    
    init() {
        // Check if we're returning from auth
        this.checkAuthCallback();
        
        // Setup event listeners when DOM is ready
        window.addEventListener('DOMContentLoaded', () => {
            this.setupUIElements();
            this.setupEventListeners();
            this.updateUI();
        });
    }
    
    setupUIElements() {
        this.elements = {
            connectButton: document.getElementById('spotifyConnect'),
            playerContainer: document.getElementById('spotifyPlayer'),
            playButton: document.getElementById('spotifyPlay'),
            nextButton: document.getElementById('spotifyNext'),
            prevButton: document.getElementById('spotifyPrev'),
            trackInfo: document.getElementById('spotifyTrackInfo'),
            albumArt: document.getElementById('spotifyAlbumArt'),
            workPlaylistSelect: document.getElementById('workPlaylist'),
            breakPlaylistSelect: document.getElementById('breakPlaylist'),
            autoPlayToggle: document.getElementById('spotifyAutoPlay'),
            searchInput: document.getElementById('spotifySearch'),
            searchResults: document.getElementById('spotifySearchResults'),
        };
        
        // Update auto play toggle based on saved preference
        if (this.elements.autoPlayToggle) {
            this.elements.autoPlayToggle.checked = this.autoPlay;
        }
    }
    
    setupEventListeners() {
        // Connect/login button
        if (this.elements.connectButton) {
            this.elements.connectButton.addEventListener('click', () => {
                if (this.isConnected) {
                    this.disconnect();
                } else {
                    this.authorize();
                }
            });
        }
        
        // Player controls
        if (this.elements.playButton) {
            this.elements.playButton.addEventListener('click', () => {
                if (this.isPlaying) {
                    this.pause();
                } else {
                    this.play();
                }
            });
        }
        
        if (this.elements.nextButton) {
            this.elements.nextButton.addEventListener('click', () => this.next());
        }
        
        if (this.elements.prevButton) {
            this.elements.prevButton.addEventListener('click', () => this.previous());
        }
        
        // Auto play toggle
        if (this.elements.autoPlayToggle) {
            this.elements.autoPlayToggle.addEventListener('change', (e) => {
                this.autoPlay = e.target.checked;
                localStorage.setItem('spotifyAutoPlay', this.autoPlay);
            });
        }
        
        // Playlist selection
        if (this.elements.workPlaylistSelect) {
            this.elements.workPlaylistSelect.addEventListener('change', (e) => {
                const option = e.target.selectedOptions[0];
                this.workPlaylistId = option.value;
                this.workPlaylistName = option.textContent;
                localStorage.setItem('workPlaylistId', this.workPlaylistId);
                localStorage.setItem('workPlaylistName', this.workPlaylistName);
            });
        }
        
        if (this.elements.breakPlaylistSelect) {
            this.elements.breakPlaylistSelect.addEventListener('change', (e) => {
                const option = e.target.selectedOptions[0];
                this.breakPlaylistId = option.value;
                this.breakPlaylistName = option.textContent;
                localStorage.setItem('breakPlaylistId', this.breakPlaylistId);
                localStorage.setItem('breakPlaylistName', this.breakPlaylistName);
            });
        }
        
        // Search input
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', this.debounce(() => {
                const query = this.elements.searchInput.value.trim();
                if (query) {
                    this.searchPlaylists(query);
                }
            }, 500));
        }
        
        // Listen for timer state changes
        document.addEventListener('pomidor:sessionChanged', (e) => {
            if (!this.isConnected || !this.autoPlay) return;
            
            const { isWorking } = e.detail;
            const playlistId = isWorking ? this.workPlaylistId : this.breakPlaylistId;
            
            if (playlistId) {
                this.playPlaylist(playlistId);
            }
        });
    }
    
    authorize() {
        const scopes = [
            'user-read-private',
            'user-read-email',
            'user-read-playback-state',
            'user-modify-playback-state',
            'user-read-currently-playing',
            'playlist-read-private'
        ];
        
        const authUrl = 'https://accounts.spotify.com/authorize' +
            '?client_id=' + this.clientId +
            '&response_type=token' +
            '&redirect_uri=' + encodeURIComponent(this.redirectUri) +
            '&scope=' + encodeURIComponent(scopes.join(' ')) +
            '&show_dialog=true';
        
        window.location.href = authUrl;
    }
    
    checkAuthCallback() {
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
            const params = new URLSearchParams(hash.substring(1));
            this.accessToken = params.get('access_token');
            this.expiresIn = parseInt(params.get('expires_in'));
            
            // Save token with expiration time
            const expirationTime = Date.now() + (this.expiresIn * 1000);
            localStorage.setItem('spotifyAccessToken', this.accessToken);
            localStorage.setItem('spotifyTokenExpires', expirationTime);
            
            // Clear hash from URL
            history.replaceState(null, document.title, window.location.pathname);
            
            // Set connected state
            this.isConnected = true;
            this.initializePlayer();
            this.loadUserPlaylists();
        } else {
            // Check if we have a valid token in storage
            const savedToken = localStorage.getItem('spotifyAccessToken');
            const expirationTime = localStorage.getItem('spotifyTokenExpires');
            
            if (savedToken && expirationTime && Date.now() < parseInt(expirationTime)) {
                this.accessToken = savedToken;
                this.isConnected = true;
                this.initializePlayer();
                this.loadUserPlaylists();
            }
        }
    }
    
    disconnect() {
        this.accessToken = null;
        localStorage.removeItem('spotifyAccessToken');
        localStorage.removeItem('spotifyTokenExpires');
        this.isConnected = false;
        this.updateUI();
    }
    
    initializePlayer() {
        // Load the Spotify Web Playback SDK
        if (!window.Spotify) {
            const script = document.createElement('script');
            script.src = 'https://sdk.scdn.co/spotify-player.js';
            script.async = true;
            document.body.appendChild(script);
            
            window.onSpotifyWebPlaybackSDKReady = () => {
                this.createPlayer();
            };
        } else {
            this.createPlayer();
        }
    }
    
    createPlayer() {
        this.player = new Spotify.Player({
            name: 'Pomidor Timer Player',
            getOAuthToken: cb => cb(this.accessToken),
            volume: 0.5
        });
        
        // Error handling
        this.player.addListener('initialization_error', ({ message }) => {
            console.error('Spotify player initialization error:', message);
        });
        
        this.player.addListener('authentication_error', ({ message }) => {
            console.error('Spotify player authentication error:', message);
            this.disconnect();
        });
        
        this.player.addListener('account_error', ({ message }) => {
            console.error('Spotify player account error:', message);
        });
        
        this.player.addListener('playback_error', ({ message }) => {
            console.error('Spotify player playback error:', message);
        });
        
        // Ready
        this.player.addListener('ready', ({ device_id }) => {
            console.log('Spotify player ready with device ID:', device_id);
            this.deviceId = device_id;
            this.updateUI();
        });
        
        // Not Ready
        this.player.addListener('not_ready', ({ device_id }) => {
            console.log('Spotify player device has gone offline:', device_id);
        });
        
        // State changes
        this.player.addListener('player_state_changed', state => {
            if (!state) return;
            
            this.currentTrack = state.track_window.current_track;
            this.isPlaying = !state.paused;
            this.updatePlayerUI();
        });
        
        // Connect to the player
        this.player.connect();
    }
    
    updateUI() {
        if (this.elements.connectButton) {
            this.elements.connectButton.textContent = this.isConnected ? 'Disconnect from Spotify' : 'Connect with Spotify';
        }
        
        if (this.elements.playerContainer) {
            this.elements.playerContainer.style.display = this.isConnected ? 'block' : 'none';
        }
    }
    
    updatePlayerUI() {
        if (!this.elements.playButton || !this.elements.trackInfo || !this.elements.albumArt) return;
        
        // Update play/pause button
        this.elements.playButton.innerHTML = this.isPlaying ? '⏸️' : '▶️';
        
        // Update track info
        if (this.currentTrack) {
            const artistNames = this.currentTrack.artists.map(artist => artist.name).join(', ');
            this.elements.trackInfo.textContent = `${this.currentTrack.name} - ${artistNames}`;
            
            // Update album art if available
            if (this.currentTrack.album && this.currentTrack.album.images && this.currentTrack.album.images.length > 0) {
                this.elements.albumArt.src = this.currentTrack.album.images[0].url;
                this.elements.albumArt.style.display = 'block';
            } else {
                this.elements.albumArt.style.display = 'none';
            }
        } else {
            this.elements.trackInfo.textContent = 'No track playing';
            this.elements.albumArt.style.display = 'none';
        }
    }
    
    // Playback controls
    async play(uri) {
        if (!this.isConnected || !this.deviceId) return;
        
        try {
            const body = {};
            if (uri) {
                if (uri.includes('playlist')) {
                    body.context_uri = uri;
                } else {
                    body.uris = [uri];
                }
            }
            
            await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: Object.keys(body).length ? JSON.stringify(body) : null
            });
            
            this.isPlaying = true;
            this.updatePlayerUI();
        } catch (error) {
            console.error('Error playing track:', error);
        }
    }
    
    async pause() {
        if (!this.isConnected || !this.deviceId) return;
        
        try {
            await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${this.deviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            this.isPlaying = false;
            this.updatePlayerUI();
        } catch (error) {
            console.error('Error pausing track:', error);
        }
    }
    
    async next() {
        if (!this.isConnected || !this.deviceId) return;
        
        try {
            await fetch(`https://api.spotify.com/v1/me/player/next?device_id=${this.deviceId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
        } catch (error) {
            console.error('Error skipping to next track:', error);
        }
    }
    
    async previous() {
        if (!this.isConnected || !this.deviceId) return;
        
        try {
            await fetch(`https://api.spotify.com/v1/me/player/previous?device_id=${this.deviceId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
        } catch (error) {
            console.error('Error going to previous track:', error);
        }
    }
    
    async playPlaylist(playlistId) {
        if (!playlistId) return;
        this.play(`spotify:playlist:${playlistId}`);
    }
    
    async loadUserPlaylists() {
        if (!this.isConnected) return;
        
        try {
            const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            const data = await response.json();
            
            // Populate playlist selections
            this.populatePlaylistSelects(data.items);
        } catch (error) {
            console.error('Error loading playlists:', error);
        }
    }
    
    populatePlaylistSelects(playlists) {
        if (!this.elements.workPlaylistSelect || !this.elements.breakPlaylistSelect) return;
        
        // Clear existing options except the default one
        while (this.elements.workPlaylistSelect.options.length > 1) {
            this.elements.workPlaylistSelect.remove(1);
        }
        
        while (this.elements.breakPlaylistSelect.options.length > 1) {
            this.elements.breakPlaylistSelect.remove(1);
        }
        
        // Add playlists
        playlists.forEach(playlist => {
            // Work playlist select
            const workOption = document.createElement('option');
            workOption.value = playlist.id;
            workOption.textContent = playlist.name;
            if (playlist.id === this.workPlaylistId) {
                workOption.selected = true;
            }
            this.elements.workPlaylistSelect.appendChild(workOption);
            
            // Break playlist select
            const breakOption = document.createElement('option');
            breakOption.value = playlist.id;
            breakOption.textContent = playlist.name;
            if (playlist.id === this.breakPlaylistId) {
                breakOption.selected = true;
            }
            this.elements.breakPlaylistSelect.appendChild(breakOption);
        });
    }
    
    async searchPlaylists(query) {
        if (!this.isConnected || !this.elements.searchResults) return;
        
        try {
            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=5`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            const data = await response.json();
            
            // Clear previous results
            this.elements.searchResults.innerHTML = '';
            
            // Display results
            if (data.playlists && data.playlists.items.length > 0) {
                data.playlists.items.forEach(playlist => {
                    const item = document.createElement('div');
                    item.className = 'search-result-item';
                    
                    const imageUrl = playlist.images && playlist.images.length > 0 ? 
                        playlist.images[0].url : 'path/to/default-image.png';
                    
                    item.innerHTML = `
                        <img src="${imageUrl}" alt="${playlist.name}" width="40" height="40">
                        <div>${playlist.name} by ${playlist.owner.display_name}</div>
                        <div>
                            <button class="mini-button work-btn" data-id="${playlist.id}" data-name="${playlist.name}">Work</button>
                            <button class="mini-button break-btn" data-id="${playlist.id}" data-name="${playlist.name}">Break</button>
                        </div>
                    `;
                    
                    // Add event listeners to buttons
                    const workBtn = item.querySelector('.work-btn');
                    const breakBtn = item.querySelector('.break-btn');
                    
                    workBtn.addEventListener('click', () => {
                        this.workPlaylistId = workBtn.dataset.id;
                        this.workPlaylistName = workBtn.dataset.name;
                        localStorage.setItem('workPlaylistId', this.workPlaylistId);
                        localStorage.setItem('workPlaylistName', this.workPlaylistName);
                        
                        // Update select element
                        if (this.elements.workPlaylistSelect) {
                            const option = Array.from(this.elements.workPlaylistSelect.options)
                                .find(opt => opt.value === this.workPlaylistId);
                            
                            if (option) {
                                option.selected = true;
                            } else {
                                const newOption = document.createElement('option');
                                newOption.value = this.workPlaylistId;
                                newOption.textContent = this.workPlaylistName;
                                newOption.selected = true;
                                this.elements.workPlaylistSelect.appendChild(newOption);
                            }
                        }
                    });
                    
                    breakBtn.addEventListener('click', () => {
                        this.breakPlaylistId = breakBtn.dataset.id;
                        this.breakPlaylistName = breakBtn.dataset.name;
                        localStorage.setItem('breakPlaylistId', this.breakPlaylistId);
                        localStorage.setItem('breakPlaylistName', this.breakPlaylistName);
                        
                        // Update select element
                        if (this.elements.breakPlaylistSelect) {
                            const option = Array.from(this.elements.breakPlaylistSelect.options)
                                .find(opt => opt.value === this.breakPlaylistId);
                            
                            if (option) {
                                option.selected = true;
                            } else {
                                const newOption = document.createElement('option');
                                newOption.value = this.breakPlaylistId;
                                newOption.textContent = this.breakPlaylistName;
                                newOption.selected = true;
                                this.elements.breakPlaylistSelect.appendChild(newOption);
                            }
                        }
                    });
                    
                    this.elements.searchResults.appendChild(item);
                });
            } else {
                this.elements.searchResults.innerHTML = '<div class="no-results">No playlists found</div>';
            }
        } catch (error) {
            console.error('Error searching playlists:', error);
        }
    }
    
    // Utility method to debounce function calls
    debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
}

// Initialize the Spotify controller
const spotifyController = new SpotifyController();

// Export for use in other scripts
window.spotifyController = spotifyController;
