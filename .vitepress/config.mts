import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Sanjeev AI Docs",
  description: "Centralized Documentation Portal",
  srcDir: '../docs',
  outDir: './.vitepress/dist',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      {
        text: 'Projects',
        items: [
          { text: 'Sanjeev AI', link: '/' },
          { text: 'Add another project here...', link: 'https://example.com/docs' }
        ]
      }
    ],
    sidebar: [
      {
        text: 'Documentation',
        items: [
          { text: 'ADR', link: '/adr/' },
          { text: 'Framework', link: '/framework/' },
          { text: 'Ops', link: '/ops/' },
          { text: 'Planning', link: '/planning/implementation_status' },
          { text: 'Specs', link: '/specs/' },
          { text: 'Support', link: '/support/' },
          { text: 'Testing', link: '/testing/' },
          { text: 'User Guides', link: '/user_guides/' }
        ]
      }
    ]
  }
})
