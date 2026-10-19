import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// jsdom doesn't implement <dialog> modality yet.
const dialogPrototype = HTMLDialogElement.prototype as Partial<HTMLDialogElement>;
dialogPrototype.showModal ??= function showModal(this: HTMLDialogElement) {
  this.open = true;
};
dialogPrototype.close ??= function close(this: HTMLDialogElement) {
  this.open = false;
};
