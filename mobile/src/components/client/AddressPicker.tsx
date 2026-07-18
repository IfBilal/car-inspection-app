import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScalePressable } from '@/components/ui/Pressable';
import { useTheme } from '@/theme/ThemeProvider';
import { useDebounced } from '@/lib/useDebounced';

type AddressSuggestion = {
  formatted: string;
  lat: number;
  lon: number;
};

type Props = {
  value: string;
  latitude: number | null;
  longitude: number | null;
  onChangeText: (value: string) => void;
  onManualAddressChange: (value: string) => void;
  onLocationChange: (location: { latitude: number; longitude: number }) => void;
};

const apiKey = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY?.trim();
const DEFAULT_LOCATION = { latitude: 30.3753, longitude: 69.3451 };

function mapHtml(latitude: number, longitude: number) {
  const key = JSON.stringify(apiKey ?? '');
  return `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;margin:0}.leaflet-control-attribution{font:10px sans-serif}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const initial = [${latitude}, ${longitude}];
  const map = L.map('map', { zoomControl: true }).setView(initial, 13);
  L.tileLayer('https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=' + ${key}, {
    maxZoom: 20,
    attribution: '© OpenStreetMap contributors, © Geoapify'
  }).addTo(map);
  let marker = L.marker(initial, { draggable: true }).addTo(map);
  const send = (latlng) => window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: latlng.lat, longitude: latlng.lng }));
  map.on('click', (event) => { marker.setLatLng(event.latlng); send(event.latlng); });
  marker.on('dragend', () => send(marker.getLatLng()));
</script></body></html>`;
}

export function AddressPicker({
  value,
  latitude,
  longitude,
  onChangeText,
  onManualAddressChange,
  onLocationChange,
}: Props) {
  const { colors, radii } = useTheme();
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const debouncedAddress = useDebounced(value, 350);
  const location = useMemo(
    () => ({ latitude: latitude ?? DEFAULT_LOCATION.latitude, longitude: longitude ?? DEFAULT_LOCATION.longitude }),
    [latitude, longitude],
  );

  useEffect(() => {
    if (!apiKey || debouncedAddress.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const search = async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?format=json&limit=5&text=${encodeURIComponent(debouncedAddress)}&apiKey=${apiKey}`,
          { signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok) throw new Error('Address search failed');
        setSuggestions(
          (data.results ?? []).map((result: AddressSuggestion) => ({
            formatted: result.formatted,
            lat: result.lat,
            lon: result.lon,
          })),
        );
      } catch (error: any) {
        if (error?.name !== 'AbortError') setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    };
    void search();
    return () => controller.abort();
  }, [debouncedAddress]);

  const selectLocation = async (next: { latitude: number; longitude: number }, formatted?: string) => {
    onLocationChange(next);
    setSuggestions([]);
    if (formatted) {
      onChangeText(formatted);
      return;
    }
    if (!apiKey) return;
    try {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/reverse?format=json&lat=${next.latitude}&lon=${next.longitude}&apiKey=${apiKey}`,
      );
      const data = await response.json();
      const address = data.results?.[0]?.formatted;
      if (response.ok && address) onChangeText(address);
    } catch {
      // Coordinates still identify the selected location if reverse geocoding is unavailable.
    }
  };

  const handleMapMessage = (event: WebViewMessageEvent) => {
    try {
      const point = JSON.parse(event.nativeEvent.data) as { latitude: number; longitude: number };
      if (Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) void selectLocation(point);
    } catch {
      // Ignore malformed messages from the embedded map.
    }
  };

  if (!apiKey) {
    return (
      <Input
        label="Address (optional)"
        multiline
        numberOfLines={2}
        value={value}
        onChangeText={onManualAddressChange}
        helper="Add EXPO_PUBLIC_GEOAPIFY_API_KEY to enable address search and map selection"
      />
    );
  }

  return (
    <View style={styles.wrap}>
      <View>
        <Input
          label="Address (optional)"
          value={value}
          onChangeText={onManualAddressChange}
          placeholder="Search for an address"
          autoCorrect={false}
          helper="Search, then tap or drag the map pin to set the exact location"
        />
        {searching ? <ActivityIndicator style={styles.searching} size="small" color={colors.primary} /> : null}
      </View>

      {suggestions.length > 0 ? (
        <Card padded={false} style={styles.suggestions}>
          {suggestions.map((suggestion) => (
            <ScalePressable
              key={`${suggestion.lat}-${suggestion.lon}-${suggestion.formatted}`}
              onPress={() =>
                void selectLocation(
                  { latitude: suggestion.lat, longitude: suggestion.lon },
                  suggestion.formatted,
                )
              }
              style={styles.suggestion}
            >
              <MapPin size={18} color={colors.primary} />
              <AppText variant="caption" style={{ flex: 1 }}>
                {suggestion.formatted}
              </AppText>
            </ScalePressable>
          ))}
        </Card>
      ) : null}

      <View style={[styles.map, { borderColor: colors.border, borderRadius: radii.input }]}>
        <WebView
          key={`${location.latitude}-${location.longitude}`}
          originWhitelist={['*']}
          source={{ html: mapHtml(location.latitude, location.longitude) }}
          onMessage={handleMapMessage}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  searching: { position: 'absolute', right: 16, top: 37 },
  suggestions: { overflow: 'hidden' },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  map: { height: 260, overflow: 'hidden', borderWidth: 1 },
});
