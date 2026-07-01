'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontSize: string;
  borderRadius: string;
  sidebarCollapsed: boolean;
}

interface ThemeContextType {
  theme: ThemeConfig;
  updateTheme: (updates: Partial<ThemeConfig>) => void;
  isLoading: boolean;
}

const defaultTheme: ThemeConfig = {
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',
  fontFamily: 'Inter',
  fontSize: '14px',
  borderRadius: '8px',
  sidebarCollapsed: false,
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  updateTheme: () => {},
  isLoading: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemeFromDB();
  }, []);

  const loadThemeFromDB = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value');

      if (data) {
        const settings: Record<string, unknown> = {};
        data.forEach((item) => {
          settings[item.setting_key] = item.setting_value;
        });

        setTheme((prev) => ({
          ...prev,
          primaryColor: (settings.primary_color as string) || prev.primaryColor,
          secondaryColor: (settings.secondary_color as string) || prev.secondaryColor,
          fontFamily: (settings.font_family as string) || prev.fontFamily,
          fontSize: (settings.font_size as string) || prev.fontSize,
          borderRadius: (settings.border_radius as string) || prev.borderRadius,
          sidebarCollapsed: (settings.sidebar_collapsed as string) === 'true',
        }));
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTheme = async (updates: Partial<ThemeConfig>) => {
    const newTheme = { ...theme, ...updates };
    setTheme(newTheme);

    // Apply to CSS variables
    document.documentElement.style.setProperty('--primary', newTheme.primaryColor);
    document.documentElement.style.setProperty('--secondary', newTheme.secondaryColor);
    document.documentElement.style.setProperty('--font-family', newTheme.fontFamily);
    document.documentElement.style.setProperty('--font-size', newTheme.fontSize);
    document.documentElement.style.setProperty('--border-radius', newTheme.borderRadius);

    // Save to DB
    try {
      const supabase = createClient();
      const settingsToUpdate: Record<string, unknown> = {};
      
      if (updates.primaryColor) settingsToUpdate.primary_color = updates.primaryColor;
      if (updates.secondaryColor) settingsToUpdate.secondary_color = updates.secondaryColor;
      if (updates.fontFamily) settingsToUpdate.font_family = updates.fontFamily;
      if (updates.fontSize) settingsToUpdate.font_size = updates.fontSize;
      if (updates.borderRadius) settingsToUpdate.border_radius = updates.borderRadius;
      if (updates.sidebarCollapsed !== undefined) settingsToUpdate.sidebar_collapsed = String(updates.sidebarCollapsed);

      for (const [key, value] of Object.entries(settingsToUpdate)) {
        await supabase
          .from('app_settings')
          .upsert({ setting_key: key, setting_value: value, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' });
      }
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', theme.primaryColor);
    document.documentElement.style.setProperty('--secondary', theme.secondaryColor);
    document.documentElement.style.setProperty('--font-family', theme.fontFamily);
    document.documentElement.style.setProperty('--font-size', theme.fontSize);
    document.documentElement.style.setProperty('--border-radius', theme.borderRadius);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);