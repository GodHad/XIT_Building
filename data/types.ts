export type PinId = string;

export type Slide = {
    id: string;
    mediaType: 'image' | 'flipbook';
    src: string;
    thumb?: string;
    caption: string;
    locationPin?: PinId | null;
}

export type Pin = {
    id: PinId;
    x: number;
    y: number;
    label?: string;
};

export type BuildingTrack = {
    id: string;
    name: string;
    mapRef: string;
    pins: Pin[];
    slides: Slide[];
    startPinId?: PinId;
}