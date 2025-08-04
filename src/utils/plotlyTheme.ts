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

export interface ChartCharacteristics {
  traceCount: number;
  totalDataPoints: number;
  chartTypes: string[];
  hasColorscale: boolean;
  hasAnimation: boolean;
  interactionLevel: 'static' | 'hover' | 'interactive';
  dataDensity: 'sparse' | 'medium' | 'dense';
  visualComplexity: 'simple' | 'moderate' | 'complex';
}

export interface ThemeStrategy {
  priority: 'primary' | 'secondary' | 'accent';
  purpose: 'analytical' | 'dashboard' | 'presentation';
  colorIntensity: 'subtle' | 'normal' | 'vibrant';
  contrastLevel: 'low' | 'medium' | 'high';
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
 * Analyze chart characteristics for intelligent theming
 */
export function analyzeChartCharacteristics(data: any[], layout: any = {}): ChartCharacteristics {
  const traceCount = data.length;
  const chartTypes = [...new Set(data.map(trace => trace.type || 'scatter'))];
  
  // Calculate total data points
  const totalDataPoints = data.reduce((total, trace) => {
    if (trace.x && Array.isArray(trace.x)) return total + trace.x.length;
    if (trace.values && Array.isArray(trace.values)) return total + trace.values.length;
    if (trace.z && Array.isArray(trace.z)) return total + trace.z.flat().length;
    return total + 10; // Default estimate
  }, 0);
  
  // Check for colorscales
  const hasColorscale = data.some(trace => 
    trace.marker?.colorscale || 
    trace.colorscale ||
    (Array.isArray(trace.marker?.color) && trace.marker?.color.length > 1)
  );
  
  // Check for animations
  const hasAnimation = !!(layout.transition || data.some(trace => trace.animation));
  
  // Determine interaction level
  let interactionLevel: 'static' | 'hover' | 'interactive' = 'static';
  if (layout.hovermode && layout.hovermode !== 'false') interactionLevel = 'hover';
  if (data.some(trace => trace.hoverinfo || trace.customdata)) interactionLevel = 'interactive';
  
  // Determine data density
  let dataDensity: 'sparse' | 'medium' | 'dense' = 'medium';
  if (totalDataPoints < 20) dataDensity = 'sparse';
  else if (totalDataPoints > 100) dataDensity = 'dense';
  
  // Determine visual complexity
  let visualComplexity: 'simple' | 'moderate' | 'complex' = 'simple';
  if (traceCount > 1 || hasColorscale) visualComplexity = 'moderate';
  if (traceCount > 3 || (hasColorscale && hasAnimation) || chartTypes.length > 2) {
    visualComplexity = 'complex';
  }
  
  return {
    traceCount,
    totalDataPoints,
    chartTypes,
    hasColorscale,
    hasAnimation,
    interactionLevel,
    dataDensity,
    visualComplexity
  };
}

/**
 * Determine optimal theming strategy based on chart characteristics
 */
export function determineThemeStrategy(
  characteristics: ChartCharacteristics,
  options: Partial<ThemeStrategy> = {}
): ThemeStrategy {
  // Default strategy
  let strategy: ThemeStrategy = {
    priority: 'primary',
    purpose: 'dashboard',
    colorIntensity: 'normal',
    contrastLevel: 'medium'
  };

  // Adjust based on visual complexity
  if (characteristics.visualComplexity === 'complex') {
    strategy.colorIntensity = 'subtle';
    strategy.contrastLevel = 'high';
  } else if (characteristics.visualComplexity === 'simple') {
    strategy.colorIntensity = 'vibrant';
  }

  // Adjust based on data density
  if (characteristics.dataDensity === 'dense') {
    strategy.colorIntensity = 'subtle';
    strategy.contrastLevel = 'high';
  } else if (characteristics.dataDensity === 'sparse') {
    strategy.colorIntensity = 'vibrant';
  }

  // Adjust based on interaction level
  if (characteristics.interactionLevel === 'interactive') {
    strategy.purpose = 'analytical';
    strategy.contrastLevel = 'high';
  } else if (characteristics.interactionLevel === 'static') {
    strategy.purpose = 'presentation';
  }

  // Apply any user overrides
  return { ...strategy, ...options };
}

/**
 * Generate intelligent color palette based on strategy
 */
export function generateIntelligentColorPalette(
  colors: PlotlyThemeColors,
  strategy: ThemeStrategy,
  traceCount: number = 1
): string[] {
  const baseColors = strategy.priority === 'accent' 
    ? [colors.accent, colors.accentLight, colors.accentDark, ...colors.primary]
    : colors.categorical;

  // Adjust color intensity
  const adjustedColors = baseColors.map(color => {
    if (strategy.colorIntensity === 'subtle') {
      return adjustColorOpacity(color, 0.7);
    } else if (strategy.colorIntensity === 'vibrant') {
      return adjustColorSaturation(color, 1.2);
    }
    return color;
  });

  // Ensure we have enough colors for all traces
  const neededColors = Math.max(traceCount, 5);
  while (adjustedColors.length < neededColors) {
    adjustedColors.push(...adjustedColors.slice(0, neededColors - adjustedColors.length));
  }

  return adjustedColors.slice(0, neededColors);
}

/**
 * Adjust color opacity (for subtle theming)
 */
function adjustColorOpacity(hexColor: string, opacity: number): string {
  // Convert hex to rgba with opacity
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Adjust color saturation (for vibrant theming)
 */
function adjustColorSaturation(hexColor: string, factor: number): string {
  // Simple saturation adjustment - in a real implementation, 
  // you'd convert to HSL, adjust saturation, and convert back
  return hexColor; // Placeholder - would need full HSL conversion
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
 * Apply intelligent theme colors to chart data traces
 */
export function applyThemeToTraces(
  data: any[], 
  layout: any = {}, 
  themeOptions: Partial<ThemeStrategy> = {}
): any[] {
  const colors = getCurrentThemeColors();
  const characteristics = analyzeChartCharacteristics(data, layout);
  const strategy = determineThemeStrategy(characteristics, themeOptions);
  const intelligentPalette = generateIntelligentColorPalette(colors, strategy, data.length);
  
  console.log('🧠 Intelligent theming analysis:', {
    characteristics,
    strategy,
    palette: intelligentPalette.slice(0, 3) + (intelligentPalette.length > 3 ? '...' : '')
  });
  
  return data.map((trace, index) => {
    const updatedTrace = { ...trace };
    const traceColor = intelligentPalette[index % intelligentPalette.length];
    
    // Handle different chart types with intelligent coloring
    if (trace.type === 'bar') {
      updatedTrace.marker = {
        ...trace.marker,
        color: traceColor,
        opacity: strategy.colorIntensity === 'subtle' ? 0.8 : 1,
        line: {
          color: colors.gridColor,
          width: strategy.contrastLevel === 'high' ? 2 : 1,
          ...trace.marker?.line
        }
      };
    } 
    
    else if (trace.type === 'scatter') {
      // Handle colorscale-based scatter plots (bubble plots)
      if (Array.isArray(trace.marker?.color) && trace.marker?.colorscale) {
        const themeColorscale = createIntelligentColorscale(colors, strategy, trace.marker.colorscale);
        updatedTrace.marker = {
          ...trace.marker,
          colorscale: themeColorscale,
          line: {
            color: colors.backgroundColor,
            width: strategy.contrastLevel === 'high' ? 2 : 1,
            ...trace.marker?.line
          }
        };
      } else {
        // Regular scatter plots
        if (trace.mode?.includes('markers')) {
          updatedTrace.marker = {
            ...trace.marker,
            color: traceColor,
            opacity: strategy.dataDensity === 'dense' ? 0.7 : 1,
            size: trace.marker?.size || (strategy.dataDensity === 'dense' ? 4 : 6),
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
            color: traceColor,
            width: strategy.purpose === 'analytical' ? 3 : 2
          };
        }
      }
    } 
    
    else if (trace.type === 'pie') {
      updatedTrace.marker = {
        ...trace.marker,
        colors: intelligentPalette,
        line: {
          color: colors.backgroundColor,
          width: strategy.contrastLevel === 'high' ? 3 : 2,
          ...trace.marker?.line
        }
      };
    }
    
    // Add hover styling based on interaction level
    if (characteristics.interactionLevel !== 'static') {
      updatedTrace.hoverlabel = {
        bgcolor: colors.accent,
        bordercolor: colors.gridColor,
        font: { color: colors.backgroundColor },
        ...updatedTrace.hoverlabel
      };
    }
    
    return updatedTrace;
  });
}

/**
 * Create intelligent colorscale based on strategy
 */
function createIntelligentColorscale(
  colors: PlotlyThemeColors, 
  strategy: ThemeStrategy, 
  originalColorscale: string
): number[][] {
  const baseColorscales = {
    'RdYlGn': [colors.categorical[4], colors.categorical[2], colors.categorical[0]],
    'Viridis': [colors.accentDark, colors.accent, colors.accentLight],
    'Blues': [colors.backgroundColor, colors.categorical[1], colors.accentDark],
    'Reds': [colors.backgroundColor, colors.categorical[4], colors.categorical[6]],
    'Greens': [colors.backgroundColor, colors.categorical[3], colors.categorical[0]]
  };
  
  const baseColors = baseColorscales[originalColorscale as keyof typeof baseColorscales] || 
                    [colors.accentDark, colors.accent, colors.accentLight];
  
  // Adjust intensity based on strategy
  const adjustedColors = baseColors.map(color => {
    if (strategy.colorIntensity === 'subtle') {
      return adjustColorOpacity(color, 0.8);
    } else if (strategy.colorIntensity === 'vibrant') {
      return color; // Keep full intensity
    }
    return color;
  });
  
  // Create colorscale array with proper format
  return adjustedColors.map((color, index) => [
    index / (adjustedColors.length - 1), 
    color
  ]);
}

/**
 * Create a complete themed Plotly configuration with intelligent analysis
 */
export function createThemedPlotlyConfig(
  data: any[], 
  customLayout: any = {}, 
  customConfig: any = {},
  themeOptions: Partial<ThemeStrategy> = {}
): { data: any[], layout: any, config: any } {
  const characteristics = analyzeChartCharacteristics(data, customLayout);
  const strategy = determineThemeStrategy(characteristics, themeOptions);
  
  // Apply intelligent theming to traces
  const themedData = applyThemeToTraces(data, customLayout, themeOptions);
  
  // Create enhanced layout based on strategy
  const enhancedLayout = {
    ...createThemedLayout(customLayout),
    // Adjust layout based on strategy
    ...(strategy.purpose === 'analytical' && {
      showlegend: true,
      legend: { orientation: 'v', x: 1.02, y: 1 }
    }),
    ...(strategy.purpose === 'presentation' && {
      showlegend: false,
      margin: { l: 40, r: 40, t: 60, b: 40 }
    }),
    ...(characteristics.dataDensity === 'dense' && {
      hovermode: 'closest'
    })
  };
  
  // Create enhanced config based on characteristics
  const enhancedConfig = {
    responsive: true,
    displayModeBar: characteristics.interactionLevel === 'interactive' ? 'hover' : false,
    modeBarButtonsToRemove: characteristics.interactionLevel === 'static' 
      ? ['pan2d', 'lasso2d', 'select2d', 'zoom2d', 'autoScale2d']
      : ['pan2d', 'lasso2d', 'select2d'],
    displaylogo: false,
    scrollZoom: characteristics.dataDensity === 'dense',
    ...customConfig
  };
  
  return {
    data: themedData,
    layout: enhancedLayout,
    config: enhancedConfig
  };
}

/**
 * Convenience function for different chart purposes
 */
export function createAnalyticalChart(data: any[], layout: any = {}, config: any = {}) {
  return createThemedPlotlyConfig(data, layout, config, { 
    purpose: 'analytical', 
    contrastLevel: 'high' 
  });
}

export function createDashboardChart(data: any[], layout: any = {}, config: any = {}) {
  return createThemedPlotlyConfig(data, layout, config, { 
    purpose: 'dashboard', 
    colorIntensity: 'normal' 
  });
}

export function createPresentationChart(data: any[], layout: any = {}, config: any = {}) {
  return createThemedPlotlyConfig(data, layout, config, { 
    purpose: 'presentation', 
    colorIntensity: 'vibrant' 
  });
}