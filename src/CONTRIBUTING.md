# Contributing to GitHub Actions Deployment Dashboard

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Please be respectful and constructive in all interactions. We aim to maintain a welcoming and inclusive environment.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- A GitHub account
- Basic knowledge of React, TypeScript, and Tailwind CSS

### Local Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   - Navigate to `http://localhost:3000` (or the port shown in terminal)

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feature/add-xyz` - For new features
- `fix/issue-123` - For bug fixes
- `docs/update-readme` - For documentation
- `refactor/component-name` - For refactoring

### Making Changes

1. **Create a new branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Write clean, readable code
   - Follow existing code style
   - Add comments for complex logic

3. **Test your changes:**
   ```bash
   npm run build
   ```

4. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

### Commit Message Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add batch grouping for deployments
fix: resolve token storage issue in Firefox
docs: update deployment instructions
```

## Project Structure

```
├── components/          # React components
│   ├── ui/             # Shadcn UI components
│   └── *.tsx           # Feature components
├── lib/                # Utility functions
│   ├── github.ts       # GitHub API interactions
│   └── storage.ts      # LocalStorage/IndexedDB logic
├── styles/             # Global styles
└── App.tsx             # Main application component
```

## Coding Standards

### TypeScript

- Use TypeScript for all new files
- Define interfaces for props and state
- Avoid `any` type when possible

### React

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks

### Styling

- Use Tailwind CSS utility classes
- Follow the existing color scheme (purple/pink accents)
- Ensure responsive design (mobile-first)

### Example Component

```typescript
import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  const [isActive, setIsActive] = useState(false);

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Badge variant={isActive ? 'default' : 'outline'}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
      <Button onClick={onAction}>
        Take Action
      </Button>
    </div>
  );
}
```

## Areas for Contribution

### High Priority

- 🐛 **Bug Fixes** - Fix reported issues
- 📝 **Documentation** - Improve docs and examples
- ♿ **Accessibility** - Improve keyboard navigation and screen reader support
- 🧪 **Testing** - Add unit and integration tests

### Feature Ideas

- 🔔 **Notifications** - Desktop notifications for deployment completion
- 📊 **Analytics** - Deployment statistics and history charts
- 🔍 **Search/Filter** - Search deployments and pipelines
- 🌙 **Dark Mode** - Theme switching support
- 🔐 **Token Encryption** - Enhanced security for stored tokens
- 📱 **Mobile Optimization** - Better mobile experience
- 🔄 **Auto-refresh** - Configurable polling intervals
- 📋 **Templates** - Pre-configured deployment templates

## Testing

### Manual Testing

Before submitting a PR, test:

1. **Token Setup** - Add and remove GitHub token
2. **Project Management** - Create, edit, delete projects
3. **Pipeline Configuration** - Add pipelines with various workflow inputs
4. **Deployment** - Single and batch deployments
5. **Status Tracking** - Verify status updates
6. **Release Creation** - Create GitHub releases
7. **Import/Export** - Test project JSON export/import

### Browser Testing

Test in multiple browsers:
- Chrome/Edge (Chromium)
- Firefox
- Safari (if available)

## Submitting a Pull Request

1. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request:**
   - Go to GitHub and create a PR from your branch
   - Fill in the PR template with details
   - Link any related issues

3. **PR Description should include:**
   - What changes were made
   - Why the changes are needed
   - How to test the changes
   - Screenshots (if UI changes)

4. **Code Review:**
   - Address reviewer feedback
   - Update your PR as needed
   - Be responsive to comments

## Questions or Issues?

- **Bug Reports** - Open an issue with detailed reproduction steps
- **Feature Requests** - Open an issue describing the feature and use case
- **Questions** - Open a discussion or issue

## Additional Resources

- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn/ui Documentation](https://ui.shadcn.com)
- [GitHub REST API Documentation](https://docs.github.com/en/rest)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
