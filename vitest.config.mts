import { defineConfig } from 'vitest/config';

/**
 * Vitest cobre `lib/`, `services/` e o migrator — camadas puras ou que falam
 * com o SQLite através da interface `BancoSQLite`. Nada aqui importa
 * `expo-sqlite` nem React Native.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Fuso fixo: a suíte tem casos de virada de mês e de "hoje", e eles não
    // podem passar só porque a máquina do dev está em UTC.
    env: { TZ: 'America/Sao_Paulo' },
  },
});
