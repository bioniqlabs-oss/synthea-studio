// Global type declarations

declare const __webpack_share_scopes__: {
  default: any;
};

interface Window {
  syntheaCore?: {
    get(module: string): Promise<() => any>;
    init(shareScope?: any): Promise<void>;
  };
}