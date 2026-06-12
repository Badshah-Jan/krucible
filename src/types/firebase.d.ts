/**
 * Re-export Firebase sub-module types for Expo / React Native module resolution.
 * The bare `declare module` shim hides all symbols as `any`; these re-exports
 * preserve full type safety from the @firebase/* packages.
 */
declare module "firebase/app" {
  export * from "@firebase/app";
}

declare module "firebase/auth" {
  export * from "@firebase/auth";
}

declare module "firebase/firestore" {
  export * from "@firebase/firestore";
}

declare module "firebase/storage" {
  export * from "@firebase/storage";
}

declare module "firebase/functions" {
  export * from "@firebase/functions";
}
