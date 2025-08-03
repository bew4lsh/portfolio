// Plotly.js theme utilities for dynamic theming
export interface PlotlyThemeColors {
  accent: string;
  accentLight: string;
  accentDark: string;
  primary: string[];
  categorical: string[];
  gradient: string[];
  textColor: string;
  backgroundColor: string;
  gridColor: string;
}

/**
 * Get current theme colors from CSS variables
 */
export function getCurrentThemeColors(): PlotlyThemeColors {
  if (typeof document === 'undefined') {
    // Server-side fallback
    return getDefaultThemeColors();
  }

  const style = getComputedStyle(document.documentElement);
  return {
    accent: style.getPropertyValue('--accent-regular').trim(),
    accentLight: style.getPropertyValue('--accent-light').trim(),
    accentDark: style.getPropertyValue('--accent-dark').trim(),
    primary: [
      style.getPropertyValue('--chart-color-1').trim(),
      style.getPropertyValue('--chart-color-2').trim(),
      style.getPropertyValue('--chart-color-3').trim(),
      style.getPropertyValue('--chart-color-4').trim(),
      style.getPropertyValue('--chart-color-5').trim()
    ].filter(color => color && color !== ''),
    categorical: [
      style.getPropertyValue('--chart-categorical-1').trim(),
      style.getPropertyValue('--chart-categorical-2').trim(),
      style.getPropertyValue('--chart-categorical-3').trim(),
      style.getPropertyValue('--chart-categorical-4').trim(),
      style.getPropertyValue('--chart-categorical-5').trim(),
      style.getPropertyValue('--chart-categorical-6').trim(),
      style.getPropertyValue('--chart-categorical-7').trim(),
      style.getPropertyValue('--chart-categorical-8').trim()
    ].filter(color => color && color !== ''),
    gradient: [
      style.getPropertyValue('--gradient-stop-1').trim(),
      style.getPropertyValue('--gradient-stop-2').trim(),
      style.getPropertyValue('--gradient-stop-3').trim()
    ].filter(color => color && color !== ''),
    textColor: style.getPropertyValue('--gray-200').trim(),
    backgroundColor: style.getPropertyValue('--gray-999').trim(),
    gridColor: style.getPropertyValue('--gray-800').trim()
  };
}

/**
 * Default theme colors for server-side rendering
 */
function getDefaultThemeColors(): PlotlyThemeColors {
  return {
    accent: '#7611a6',
    accentLight: '#c561f6',
    accentDark: '#1c0056',
    primary: ['#7611a6', '#c561f6', '#1c0056', '#9d4edd', '#5a189a'],
    categorical: ['#7611a6', '#2E86AB', '#F77F00', '#06D6A0', '#E63946'],
    gradient: ['#1c0056', '#7611a6', '#c561f6'],
    textColor: '#3d4663',
    backgroundColor: '#ffffff',
    gridColor: '#e3e6ee'
  };
}

/**
 * Create theme-aware Plotly layout
 */
export function createThemedLayout(customLayout: any = {}): any {
  const colors = getCurrentThemeColors();
  
  return {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: {
      family: 'Public Sans, system-ui, sans-serif',
      color: colors.textColor,
      size: 12
    },
    colorway: colors.categorical,
    margin: { l: 60, r: 40, t: 60, b: 60 },
    
    // Theme-aware axis styling
    xaxis: {
      gridcolor: colors.gridColor,
      linecolor: colors.gridColor,
      tickcolor: colors.gridColor,
      tickfont: { color: colors.textColor, size: 11 },
      titlefont: { color: colors.textColor, size: 13 },
      ...customLayout.xaxis
    },
    yaxis: {
      gridcolor: colors.gridColor,
      linecolor: colors.gridColor,
      tickcolor: colors.gridColor,
      tickfont: { color: colors.textColor, size: 11 },
      titlefont: { color: colors.textColor, size: 13 },
      ...customLayout.yaxis
    },
    
    // Theme-aware legend styling
    legend: {
      font: { color: colors.textColor, size: 11 },
      bgcolor: 'transparent',
      bordercolor: colors.gridColor,
      ...customLayout.legend
    },
    
    // Theme-aware title styling
    title: {
      font: { color: colors.textColor, size: 16 },
      ...customLayout.title
    },
    
    ...customLayout
  };
}

/**
 * Apply theme colors to chart data traces
 */
export function applyThemeToTraces(data: any[]): any[] {
  const colors = getCurrentThemeColors();
  
  return data.map((trace, index) => {
    const updatedTrace = { ...trace };
    
    // For multiple traces, use categorical colors
    if (data.length > 1 && colors.categorical.length > 0) {
      const colorIndex = index % colors.categorical.length;
      const traceColor = colors.categorical[colorIndex];
      
      // Apply color based on trace type
      if (trace.type === 'bar') {
        updatedTrace.marker = {
          ...trace.marker,
          color: trace.marker?.color || traceColor,
          line: {
            color: colors.gridColor,
            width: 1,
            ...trace.marker?.line
          }
        };
      } else if (trace.type === 'scatter') {
        if (trace.mode?.includes('markers')) {
          updatedTrace.marker = {
            ...trace.marker,
            color: trace.marker?.color || traceColor,
            line: {
              color: colors.backgroundColor,
              width: 1,
              ...trace.marker?.line
            }
          };
        }
        if (trace.mode?.includes('lines')) {
          updatedTrace.line = {
            ...trace.line,
            color: trace.line?.color || traceColor,
            width: 2
          };
        }
      } else if (trace.type === 'pie') {
        updatedTrace.marker = {
          ...trace.marker,
          colors: trace.marker?.colors || colors.categorical,
          line: {
            color: colors.backgroundColor,
            width: 2,
            ...trace.marker?.line
          }
        };
      }
    }
    
    // For single traces, use accent color
    if (data.length === 1) {
      if (trace.type === 'bar') {
        updatedTrace.marker = {
          ...trace.marker,
          color: trace.marker?.color || colors.accent
        };
      } else if (trace.type === 'scatter' && trace.mode?.includes('lines')) {
        updatedTrace.line = {
          ...trace.line,
          color: trace.line?.color || colors.accent
        };
      }
    }
    
    return updatedTrace;
  });
}

/**
 * Create a complete themed Plotly configuration
 */
export function createThemedPlotlyConfig(
  data: any[], 
  customLayout: any = {}, 
  customConfig: any = {}
): { data: any[], layout: any, config: any } {
  return {
    data: applyThemeToTraces(data),
    layout: createThemedLayout(customLayout),
    config: {
      responsive: true,
      displayModeBar: 'hover',
      modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
      displaylogo: false,
      ...customConfig
    }
  };
}