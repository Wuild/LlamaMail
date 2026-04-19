import {defineConfig} from 'electron-vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
const alias = {
	'@': path.resolve(__dirname, './src'),
	'@renderer': path.resolve(__dirname, './src/renderer'),
	'@main': path.resolve(__dirname, './src/main'),
	'@resource': path.resolve(__dirname, './src/resources'),
};

export default defineConfig({
	main: {
		resolve: {
			alias,
		},

		build: {
			outDir: 'build/main',
			sourcemap: true,
			bytecode: true,
			rollupOptions: {
				input: {
					index: 'src/main/index.ts',
					mailSyncWorker: 'src/main/workers/mailSyncWorker.ts',
					ancillarySyncWorker: 'src/main/workers/ancillarySyncWorker.ts',
				},
				external: ['electron', 'better-sqlite3', 'keytar'],
				output: {
					entryFileNames: '[name].js',
					chunkFileNames: 'chunks/[name]-[hash].js',
				},
			},
		},
	},

	preload: {
		resolve: {
			alias,
		},
		build: {
			outDir: 'build/preload',
			sourcemap: true,
			bytecode: true,
			rollupOptions: {
				external: ['electron'],
				output: {
					entryFileNames: '[name].js',
					chunkFileNames: 'chunks/[name]-[hash].js',
				},
			},
		},
	},

	renderer: {
		root: path.resolve(__dirname, 'src/renderer'),
		plugins: [react()],
		resolve: {
			alias,
		},
		base: './',
		server: {
			host: '127.0.0.1',
			port: 5174,
			strictPort: true,
		},
		build: {
			outDir: path.resolve(__dirname, 'build/renderer'),
			emptyOutDir: true,
			sourcemap: true,
			rollupOptions: {
				input: {
					window: path.resolve(__dirname, 'src/renderer/window.html'),
				},
			},
		},
	},
});
