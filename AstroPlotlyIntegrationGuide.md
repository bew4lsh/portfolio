# Server-side Plotly Preprocessing with Astro: Complete Technical Implementation Guide

This comprehensive guide provides detailed technical implementation patterns for integrating server-side Plotly preprocessing with Astro, covering all aspects from build process integration to client-side hydration.

## 1. Running Python Plotly scripts during Astro build process

Astro provides multiple integration points for executing Python scripts during the build process. The most effective approach uses custom Astro integrations with Node.js child processes.

### Core Integration Implementation

```javascript
// integrations/python-plotly.js
import { spawn } from 'child_process';
import { mkdir } from 'fs/promises';
import path from 'path';

export default function pythonPlotlyIntegration(options = {}) {
  const {
    pythonPath = 'python',
    scriptsDir = './python-scripts',
    outputDir = './src/assets/plots',
    venvPath = './python-env'
  } = options;

  return {
    name: 'python-plotly-integration',
    hooks: {
      'astro:config:setup': ({ addWatchFile, logger }) => {
        // Watch Python files for changes in dev mode
        addWatchFile(path.join(scriptsDir, '*.py'));
        logger.info('Python Plotly integration initialized');
      },

      'astro:build:start': async ({ logger }) => {
        logger.info('Executing Python Plotly scripts...');
        
        // Ensure output directory exists
        await mkdir(outputDir, { recursive: true });
        
        // Execute Python script with proper error handling
        const pythonExec = venvPath 
          ? path.join(venvPath, 'bin', 'python') 
          : pythonPath;
          
        const result = await executePythonScript(
          pythonExec, 
          path.join(scriptsDir, 'generate_plots.py'),
          ['--output-dir', outputDir]
        );
        
        logger.info('Python scripts completed successfully');
      }
    }
  };
}

async function executePythonScript(pythonPath, scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const process = spawn(pythonPath, [scriptPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Python script failed with code ${code}: ${stderr}`));
      }
    });
  });
}
```

### Astro Configuration

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import pythonPlotlyIntegration from './integrations/python-plotly.js';

export default defineConfig({
  integrations: [
    pythonPlotlyIntegration({
      scriptsDir: './python-scripts',
      outputDir: './src/assets/plots',
      venvPath: './python-env'
    })
  ],
  vite: {
    assetsInclude: ['**/*.html', '**/*.json']
  }
});
```

## 2. Converting Plotly figures to static assets

Kaleido is the current recommended engine for static export, offering better performance and reliability than the deprecated Orca.

### Python Export Implementation

```python
# python-scripts/generate_plots.py
import plotly.graph_objects as go
import plotly.io as pio
import json
import argparse
from pathlib import Path
import pandas as pd

class PlotlyExporter:
    def __init__(self, output_dir: Path):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True, parents=True)
        
        # Configure Kaleido for optimal performance
        pio.kaleido.scope.default_width = 800
        pio.kaleido.scope.default_height = 600
        pio.kaleido.scope.default_scale = 2  # For retina displays
        
    def export_figure(self, fig: go.Figure, name: str, formats: list = ['svg', 'json']):
        """Export figure in multiple formats for different use cases"""
        exports = {}
        
        if 'svg' in formats:
            svg_path = self.output_dir / f"{name}.svg"
            fig.write_image(str(svg_path), format='svg')
            exports['svg'] = str(svg_path.relative_to(self.output_dir.parent))
            
        if 'png' in formats:
            png_path = self.output_dir / f"{name}.png"
            fig.write_image(str(png_path), format='png', scale=2)
            exports['png'] = str(png_path.relative_to(self.output_dir.parent))
            
        if 'json' in formats:
            json_path = self.output_dir / f"{name}.json"
            fig.write_json(str(json_path), pretty=True)
            exports['json'] = str(json_path.relative_to(self.output_dir.parent))
            
        if 'html' in formats:
            html_path = self.output_dir / f"{name}.html"
            fig.write_html(
                str(html_path),
                include_plotlyjs='cdn',
                div_id=f"plot-{name}",
                config={'responsive': True}
            )
            exports['html'] = str(html_path.relative_to(self.output_dir.parent))
            
        return exports
    
    def create_manifest(self, plots: dict):
        """Generate metadata manifest for Astro consumption"""
        manifest = {
            'plots': plots,
            'generated_at': pd.Timestamp.now().isoformat(),
            'plotly_version': pio.__version__
        }
        
        manifest_path = self.output_dir / 'manifest.json'
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
            
        return manifest
```

### Optimized Batch Export

```python
import asyncio
import kaleido

async def batch_export_figures(figures: list, output_dir: Path):
    """Efficiently export multiple figures using Kaleido parallelization"""
    async with kaleido.Kaleido(n=4, timeout=90) as k:
        tasks = []
        for i, (fig, name) in enumerate(figures):
            task = k.write_fig(
                fig, 
                path=f"{output_dir}/{name}.svg",
                opts={"format": "svg", "width": 800, "height": 600}
            )
            tasks.append(task)
        await asyncio.gather(*tasks)
```

## 3. Astro Content Layer API integration

The Content Layer API provides a powerful data pipeline for Python-processed content with efficient caching and incremental updates.

### Content Collection Configuration

```typescript
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

const plotlyVisualization = defineCollection({
  loader: file('src/assets/plots/manifest.json'),
  schema: z.object({
    plots: z.record(
      z.object({
        svg: z.string().optional(),
        png: z.string().optional(),
        json: z.string().optional(),
        html: z.string().optional()
      })
    ),
    generated_at: z.string(),
    plotly_version: z.string()
  })
});

export const collections = {
  visualizations: plotlyVisualization
};
```

### Custom Python Data Loader

```javascript
// loaders/python-data-loader.js
export function pythonDataLoader({ scriptPath, cacheKey }) {
  return {
    name: 'python-data-loader',
    load: async ({ store, meta, logger }) => {
      const lastRun = meta.get('last-run');
      const currentTime = Date.now();
      
      // Skip if recently processed (within 5 minutes)
      if (lastRun && currentTime - lastRun < 300000) {
        logger.info('Using cached Python data');
        return;
      }
      
      // Execute Python script
      const { stdout } = await executePythonScript('python', scriptPath);
      const data = JSON.parse(stdout);
      
      // Store processed data
      for (const [id, plotData] of Object.entries(data.plots)) {
        store.set({
          id,
          data: plotData,
          digest: generateDigest(plotData)
        });
      }
      
      meta.set('last-run', currentTime);
    }
  };
}
```

## 4. Build-time Python execution patterns

Multiple execution patterns support different workflow requirements.

### CI/CD Integration Pattern

```yaml
# .github/workflows/build-and-deploy.yml
name: Build with Python Processing

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
        cache: 'pip'
    
    - name: Install Chrome (for Kaleido)
      run: |
        wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
        sudo sh -c 'echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
        sudo apt-get update
        sudo apt-get install -y google-chrome-stable
    
    - name: Install Python dependencies
      run: |
        python -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
    
    - name: Process data and generate visualizations
      run: |
        source venv/bin/activate
        python python-scripts/fetch_data.py
        python python-scripts/generate_plots.py --output-dir src/assets/plots
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies and build
      run: |
        npm ci
        npm run build
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

## 5. Plotly.js client-side hydration patterns

Progressive enhancement ensures optimal performance while maintaining full interactivity.

### Astro Component with Hydration

```astro
---
// components/PlotlyChart.astro
interface Props {
  plotId: string;
  title?: string;
  height?: string;
  formats?: string[];
}

const { plotId, title, height = '400px', formats = ['json'] } = Astro.props;

import { getEntry } from 'astro:content';
const manifest = await getEntry('visualizations', 'manifest');
const plotData = manifest?.data.plots[plotId];

// Determine best format to use
const format = formats.find(f => plotData?.[f]) || 'json';
const dataPath = plotData?.[format];

// Load JSON data if available
let jsonData = null;
if (format === 'json' && dataPath) {
  const module = await import(/* @vite-ignore */ `../assets/plots/${plotId}.json`);
  jsonData = module.default;
}
---

<div 
  class="plotly-container"
  data-plot-id={plotId}
  data-plot-format={format}
  data-plot-data={format === 'json' ? JSON.stringify(jsonData) : null}
  data-plot-url={format !== 'json' ? dataPath : null}
  style={`min-height: ${height}`}
>
  <!-- Progressive enhancement fallback -->
  <div class="plot-fallback">
    {format === 'svg' && (
      <img src={dataPath} alt={title || `Visualization ${plotId}`} />
    )}
  </div>
  
  <!-- Loading skeleton -->
  <div class="plot-skeleton" aria-hidden="true">
    <div class="skeleton-title"></div>
    <div class="skeleton-chart">
      <div class="skeleton-bars">
        {[...Array(8)].map(() => <div class="skeleton-bar" />)}
      </div>
    </div>
  </div>
</div>

<script>
  class PlotlyHydrator {
    constructor() {
      this.plotlyLoaded = false;
      this.plotlyPromise = null;
    }
    
    async loadPlotly() {
      if (this.plotlyLoaded) return window.Plotly;
      
      if (!this.plotlyPromise) {
        this.plotlyPromise = import('https://cdn.plot.ly/plotly-2.24.1.min.js')
          .then(() => {
            this.plotlyLoaded = true;
            return window.Plotly;
          });
      }
      
      return this.plotlyPromise;
    }
    
    async hydratePlot(container) {
      const plotId = container.dataset.plotId;
      const format = container.dataset.plotFormat;
      
      container.classList.add('loading');
      
      try {
        let plotData;
        
        if (format === 'json') {
          plotData = JSON.parse(container.dataset.plotData);
        }
        
        const Plotly = await this.loadPlotly();
        
        const plotDiv = document.createElement('div');
        plotDiv.style.width = '100%';
        plotDiv.style.height = container.style.minHeight || '400px';
        container.appendChild(plotDiv);
        
        await Plotly.newPlot(
          plotDiv, 
          plotData.data, 
          plotData.layout || {},
          { responsive: true, displayModeBar: 'hover' }
        );
        
        container.classList.remove('loading');
        container.classList.add('hydrated');
        
      } catch (error) {
        console.error(`Failed to hydrate plot ${plotId}:`, error);
        container.classList.remove('loading');
      }
    }
  }
  
  // Initialize hydrator
  const hydrator = new PlotlyHydrator();
  
  // Set up intersection observer for lazy loading
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        hydrator.hydratePlot(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: '100px'
  });
  
  // Observe all plot containers
  document.querySelectorAll('.plotly-container').forEach(container => {
    observer.observe(container);
  });
</script>
```

## 6. File structure and workflow examples

A well-organized file structure facilitates maintainability and scalability.

### Recommended Project Structure

```
project/
├── src/
│   ├── assets/
│   │   └── plots/          # Generated plot files
│   │       ├── manifest.json
│   │       ├── timeseries.svg
│   │       ├── timeseries.json
│   │       └── dashboard.html
│   ├── components/
│   │   ├── PlotlyChart.astro
│   │   └── ChartGrid.astro
│   ├── content/
│   │   └── config.ts
│   ├── data/              # Raw data files
│   │   └── sources/
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       ├── index.astro
│       └── dashboard.astro
├── python-scripts/         # Python processing scripts
│   ├── __init__.py
│   ├── data_processor.py
│   ├── generate_plots.py
│   ├── fetch_data.py
│   └── utils/
│       ├── __init__.py
│       ├── exporters.py
│       └── transformers.py
├── integrations/          # Astro integrations
│   └── python-plotly.js
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── requirements.txt      # Python dependencies
├── package.json
├── astro.config.mjs
└── README.md
```

## 7. Plotly figure serialization and deserialization

Efficient serialization strategies minimize file size while preserving full plot functionality.

### Advanced Serialization Class

```python
# python-scripts/utils/serialization.py
import plotly.graph_objects as go
import plotly.io as pio
import json
import numpy as np
from typing import Dict, Any
import base64
import zlib

class PlotlySerializer:
    """Advanced serialization for Plotly figures with compression and optimization"""
    
    def __init__(self, compression_threshold: int = 10000):
        self.compression_threshold = compression_threshold
        
    def serialize_figure(self, fig: go.Figure, optimize: bool = True) -> Dict[str, Any]:
        """Serialize figure with optional optimization"""
        fig_dict = fig.to_dict()
        
        if optimize:
            fig_dict = self._optimize_figure_dict(fig_dict)
            
        serialized = json.dumps(fig_dict, cls=NumpyEncoder)
        
        if len(serialized) > self.compression_threshold:
            compressed = self._compress_data(serialized)
            return {
                'type': 'compressed',
                'data': compressed,
                'original_size': len(serialized),
                'compressed_size': len(compressed)
            }
        
        return {
            'type': 'raw',
            'data': fig_dict
        }
    
    def _optimize_figure_dict(self, fig_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize figure dictionary for size and performance"""
        optimized = fig_dict.copy()
        
        if 'data' in optimized:
            for trace in optimized['data']:
                if 'x' in trace and isinstance(trace['x'], list):
                    trace['x'] = self._optimize_array(trace['x'])
                if 'y' in trace and isinstance(trace['y'], list):
                    trace['y'] = self._optimize_array(trace['y'])
                    
                trace = {k: v for k, v in trace.items() if v is not None}
                
        return optimized
    
    def _compress_data(self, data: str) -> str:
        """Compress data using zlib and base64"""
        compressed = zlib.compress(data.encode('utf-8'), level=9)
        return base64.b64encode(compressed).decode('utf-8')
```

### Client-side Deserialization

```typescript
// src/utils/plotly-deserializer.ts
export class PlotlyDeserializer {
  static async deserializeFigure(serializedData: any): Promise<any> {
    if (serializedData.type === 'compressed') {
      const decompressed = await this.decompress(serializedData.data);
      return JSON.parse(decompressed);
    }
    
    return this.reconstructFigure(serializedData.data);
  }
  
  private static async decompress(compressedData: string): Promise<string> {
    const pako = await import('pako');
    const compressed = Uint8Array.from(atob(compressedData), c => c.charCodeAt(0));
    const decompressed = pako.inflate(compressed);
    return new TextDecoder().decode(decompressed);
  }
}
```

## 8. Performance considerations and optimization

Performance optimization spans the entire pipeline from Python processing to client rendering.

### Python-side Optimization

```python
# python-scripts/utils/performance.py
import time
import functools
import psutil
import os
from concurrent.futures import ProcessPoolExecutor

class PerformanceOptimizer:
    """Performance optimization utilities for Plotly processing"""
    
    @staticmethod
    def profile_memory(func):
        """Decorator to profile memory usage"""
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            process = psutil.Process(os.getpid())
            mem_before = process.memory_info().rss / 1024 / 1024  # MB
            
            start_time = time.time()
            result = func(*args, **kwargs)
            end_time = time.time()
            
            mem_after = process.memory_info().rss / 1024 / 1024  # MB
            
            print(f"{func.__name__}:")
            print(f"  Time: {end_time - start_time:.2f}s")
            print(f"  Memory: {mem_after - mem_before:.2f}MB")
            
            return result
        return wrapper
    
    @staticmethod
    def optimize_large_dataset(df, max_points: int = 10000):
        """Downsample large datasets for visualization"""
        if len(df) <= max_points:
            return df
            
        # Use LTTB algorithm for time series
        if 'timestamp' in df.columns:
            from lttb import downsample
            return downsample(df, n_out=max_points)
        
        return df.sample(n=max_points)
```

### Build-time Optimization

```javascript
// integrations/optimized-build.js
import { createHash } from 'crypto';
import { readFile, writeFile } from 'fs/promises';

export class BuildOptimizer {
  async shouldRegenerate(sourceFiles, outputFiles) {
    const cacheFile = '.astro-plotly-cache/build-cache.json';
    
    try {
      const cache = JSON.parse(await readFile(cacheFile, 'utf-8'));
      
      for (const file of sourceFiles) {
        const currentHash = await this.getCacheKey(file);
        if (cache.sources[file] !== currentHash) {
          return true;
        }
      }
      
      return false;
    } catch {
      return true; // Regenerate if cache doesn't exist
    }
  }
}
```

## 9. Real-world code examples

Complete working example demonstrating the full integration pipeline.

### Full Dashboard Implementation

```python
# python-scripts/generate_dashboard.py
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
from pathlib import Path

class DashboardGenerator:
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.exporter = PlotlyExporter(self.output_dir)
        
    def generate_time_series(self) -> go.Figure:
        """Generate time series visualization"""
        dates = pd.date_range(
            start=datetime.now() - timedelta(days=365),
            end=datetime.now(),
            freq='D'
        )
        
        df = pd.DataFrame({
            'date': dates,
            'revenue': np.random.randn(len(dates)).cumsum() * 1000 + 50000,
            'costs': np.random.randn(len(dates)).cumsum() * 800 + 30000
        })
        
        fig = go.Figure()
        
        fig.add_trace(go.Scatter(
            x=df['date'],
            y=df['revenue'],
            name='Revenue',
            mode='lines',
            line=dict(color='#2E86AB', width=2)
        ))
        
        fig.add_trace(go.Scatter(
            x=df['date'],
            y=df['costs'],
            name='Costs',
            mode='lines',
            line=dict(color='#E63946', width=2)
        ))
        
        fig.update_layout(
            title='Financial Performance Over Time',
            xaxis_title='Date',
            yaxis_title='Amount ($)',
            hovermode='x unified',
            template='plotly_white'
        )
        
        return fig
    
    def generate_all_visualizations(self):
        """Generate all dashboard visualizations"""
        plots_metadata = {}
        
        time_series_fig = self.generate_time_series()
        plots_metadata['timeseries'] = self.exporter.export_figure(
            time_series_fig, 'timeseries', formats=['json', 'svg', 'html']
        )
        
        manifest = self.exporter.create_manifest(plots_metadata)
        
        return manifest
```

### Astro Dashboard Page

```astro
---
// src/pages/dashboard.astro
import Layout from '../layouts/Layout.astro';
import PlotlyChart from '../components/PlotlyChart.astro';
import { getEntry } from 'astro:content';

const visualizations = await getEntry('visualizations', 'manifest');
const hasData = visualizations && Object.keys(visualizations.data.plots).length > 0;
---

<Layout title="Analytics Dashboard">
  <main class="dashboard">
    <header class="dashboard-header">
      <h1>Analytics Dashboard</h1>
      <p class="last-updated">
        Last updated: {new Date(visualizations?.data.generated_at).toLocaleDateString()}
      </p>
    </header>
    
    {hasData && (
      <div class="charts-grid">
        <section class="chart-section full-width">
          <h2>Financial Performance</h2>
          <PlotlyChart 
            plotId="timeseries" 
            height="450px"
            formats={['json', 'svg']}
          />
        </section>
      </div>
    )}
  </main>
</Layout>

<style>
  .dashboard {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
    gap: 2rem;
  }
  
  .chart-section {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
</style>
```

## 10. Static export methods with Kaleido

Modern static export relies on Kaleido for reliable, performant image generation.

### Kaleido Configuration

```python
# python-scripts/utils/static_export.py
import plotly.io as pio
from pathlib import Path
from typing import Dict, List

class StaticExporter:
    """Advanced static export with Kaleido optimization"""
    
    def __init__(self, chrome_args: List[str] = None):
        if chrome_args is None:
            chrome_args = [
                '--disable-gpu',
                '--no-sandbox',
                '--disable-dev-shm-usage'
            ]
        
        pio.kaleido.scope.chromium_args = chrome_args
        pio.kaleido.scope.default_width = 1200
        pio.kaleido.scope.default_height = 800
        pio.kaleido.scope.default_scale = 2
        
    def export_static_formats(
        self, 
        fig: go.Figure, 
        base_path: Path,
        formats: List[str] = ['svg', 'png', 'pdf']
    ) -> Dict[str, Path]:
        """Export figure in multiple static formats"""
        exports = {}
        
        for format in formats:
            output_path = base_path.with_suffix(f'.{format}')
            
            if format == 'svg':
                fig.write_image(str(output_path), format='svg', scale=1)
            elif format == 'png':
                fig.write_image(str(output_path), format='png', scale=2)
            elif format == 'pdf':
                fig.write_image(str(output_path), format='pdf')
            
            exports[format] = output_path
            
        return exports
```

### Docker Configuration for Kaleido

```dockerfile
# Dockerfile
FROM python:3.9-slim

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    wget gnupg unzip \
    libnss3 libatk-bridge2.0-0 libcups2 \
    libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libxkbcommon0 \
    libpango-1.0-0 libcairo2 libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Install Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Set Chrome environment variables
ENV CHROME_BIN=/usr/bin/google-chrome
ENV CHROME_PATH=/usr/bin/google-chrome

# Copy application files
COPY python-scripts/ ./python-scripts/

CMD ["python", "python-scripts/generate_plots.py", "--output-dir", "/app/output"]
```

## 11. Integration with Astro's build hooks

Astro's build lifecycle provides multiple hooks for optimal Python integration.

### Complete Build Hooks Implementation

```javascript
// integrations/advanced-python-integration.js
export default function advancedPythonIntegration(options = {}) {
  const state = {
    startTime: null,
    generatedAssets: []
  };
  
  return {
    name: 'advanced-python-integration',
    hooks: {
      'astro:config:setup': async ({ config, command, updateConfig, addWatchFile }) => {
        console.log(`Setting up Python integration for ${command} command`);
        
        if (command === 'dev') {
          addWatchFile('./python-scripts/**/*.py');
          addWatchFile('./data/**/*.csv');
        }
        
        updateConfig({
          vite: {
            assetsInclude: ['**/*.plotly.json', '**/*.plotly.html']
          }
        });
      },
      
      'astro:config:done': async ({ config }) => {
        await validatePythonEnvironment(options.venvPath);
      },
      
      'astro:build:start': async ({ logger }) => {
        state.startTime = Date.now();
        logger.info('Starting Python plot generation...');
        
        try {
          await mkdir(options.outputDir, { recursive: true });
          
          const result = await runPythonPipeline(options, logger);
          state.generatedAssets = result.assets;
          
          logger.info(`Generated ${result.assets.length} plot assets`);
        } catch (error) {
          logger.error(`Python processing failed: ${error.message}`);
          throw error;
        }
      },
      
      'astro:build:done': async ({ dir, routes }) => {
        const duration = Date.now() - state.startTime;
        console.log(`Build completed in ${duration}ms`);
        console.log(`Generated ${routes.length} routes`);
        
        await generateBuildReport({
          duration,
          assets: state.generatedAssets,
          outputDir: dir
        });
      }
    }
  };
}
```

## 12. Managing Python dependencies in Astro projects

Robust dependency management ensures reproducible builds across different environments.

### Virtual Environment Setup

```bash
#!/bin/bash
# scripts/setup-python-env.sh

set -e

VENV_PATH="./python-env"
PYTHON_VERSION="3.9"

echo "🐍 Setting up Python environment..."

# Create virtual environment
if [ ! -d "$VENV_PATH" ]; then
    echo "Creating virtual environment..."
    python$PYTHON_VERSION -m venv $VENV_PATH
fi

# Activate and upgrade pip
source $VENV_PATH/bin/activate
pip install --upgrade pip setuptools wheel

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

echo "✅ Python environment ready"
```

### Requirements Management

```txt
# requirements.txt
# Core dependencies
plotly==5.18.0
pandas==2.1.4
numpy==1.24.3
kaleido==0.2.1

# Data processing
scipy==1.11.4
scikit-learn==1.3.2

# Performance optimization
numba==0.58.1
dask==2023.12.0

# Utilities
python-dotenv==1.0.0
click==8.1.7
pydantic==2.5.2
```

### Package Management Integration

```javascript
// integrations/python-package-manager.js
import { spawn } from 'child_process';
import path from 'path';

export class PythonPackageManager {
  constructor(venvPath = './python-env') {
    this.venvPath = venvPath;
    this.pipPath = path.join(venvPath, 'bin', 'pip');
    this.pythonPath = path.join(venvPath, 'bin', 'python');
  }
  
  async ensureVirtualEnvironment() {
    try {
      await fs.access(this.venvPath);
    } catch {
      console.log('Creating virtual environment...');
      await this.createVirtualEnvironment();
    }
  }
  
  async installRequirements(requirementsFile = 'requirements.txt') {
    await this.ensureVirtualEnvironment();
    
    return new Promise((resolve, reject) => {
      const process = spawn(this.pipPath, ['install', '-r', requirementsFile]);
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pip install failed: exit code ${code}`));
        }
      });
    });
  }
}
```

### Docker-based Dependency Management

```yaml
# docker-compose.yml
version: '3.8'

services:
  python-processor:
    build:
      context: .
      dockerfile: Dockerfile.python
    volumes:
      - ./python-scripts:/app/python-scripts
      - ./data:/app/data
      - ./src/assets/plots:/app/output
    environment:
      - PYTHONUNBUFFERED=1
    command: python python-scripts/generate_plots.py --output-dir /app/output

  astro-builder:
    build:
      context: .
      dockerfile: Dockerfile.astro
    volumes:
      - ./src:/app/src
      - ./public:/app/public
    depends_on:
      - python-processor
    command: npm run build
```

## Conclusion

This comprehensive guide provides a complete technical implementation for integrating server-side Plotly preprocessing with Astro. The solution covers:

### Key Benefits
- **Performance Optimization**: Build-time generation with efficient client-side hydration
- **Scalability**: Handles large datasets and multiple visualizations efficiently
- **Developer Experience**: Clear patterns and automated workflows
- **Production Ready**: CI/CD integration and dependency management
- **Cross-Platform**: Works on Windows, macOS, and Linux

### Implementation Summary
- **Build Integration**: Custom Astro integrations with Python execution
- **Static Export**: Kaleido-based generation of multiple formats
- **Content Layer**: Efficient data management and caching
- **Progressive Enhancement**: HTML-first with JavaScript enhancement
- **Performance**: Optimized serialization and lazy loading
- **Deployment**: Docker and CI/CD ready configurations

### Best Practices
1. Use virtual environments for Python dependency isolation
2. Implement build caching to avoid unnecessary regeneration
3. Optimize data before visualization for better performance
4. Use progressive enhancement for better user experience
5. Monitor performance metrics in production
6. Implement proper error handling and fallbacks

This implementation provides a robust foundation for building data-rich static sites with Astro and Plotly, combining the best of Python's data processing capabilities with modern web development practices.
