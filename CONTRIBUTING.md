# Contributing to Synthea Studio

Thank you for your interest in contributing to Synthea Studio! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Issues

- Check if the issue already exists in our [issue tracker](https://github.com/synthea-studio/synthea-studio/issues)
- Create a new issue with a clear title and description
- Include steps to reproduce, expected behavior, and actual behavior
- Add relevant labels (bug, enhancement, documentation, etc.)

### Suggesting Features

- Open a [discussion](https://github.com/synthea-studio/synthea-studio/discussions) first for major features
- Create a feature request issue with use cases and examples
- Be open to feedback and alternative approaches

### Submitting Code

1. **Fork the repository**
   ```bash
   git clone https://github.com/synthea-studio/synthea-studio.git
   cd synthea-studio
   git remote add upstream https://github.com/synthea-studio/synthea-studio.git
   ```

2. **Create a feature branch from develop**
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, documented code
   - Follow existing code style and conventions
   - Add tests for new functionality
   - Update documentation as needed

4. **Test your changes**
   ```bash
   # Backend tests
   cd backend
   pytest
   
   # Frontend tests
   cd frontend
   npm test
   
   # Integration tests
   docker-compose -f docker-compose.test.yml up
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new population filter feature"
   ```
   
   Follow conventional commits:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation changes
   - `style:` formatting changes
   - `refactor:` code restructuring
   - `test:` test additions/changes
   - `chore:` maintenance tasks

6. **Push and create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   - Create PR against `develop` branch
   - Fill out the PR template
   - Link related issues
   - Wait for review

### Code Style

#### Python (Backend)
- Follow PEP 8
- Use Black for formatting
- Type hints for function signatures
- Docstrings for classes and functions

```python
def create_population(
    name: str,
    size: int,
    config: Dict[str, Any]
) -> Population:
    """
    Create a new synthetic population.
    
    Args:
        name: Population identifier
        size: Number of patients to generate
        config: Synthea configuration parameters
        
    Returns:
        Population object with generation job ID
    """
    pass
```

#### TypeScript/React (Frontend)
- Use TypeScript for type safety
- Follow React hooks best practices
- Use functional components
- Prettier for formatting

```typescript
interface PopulationProps {
  name: string;
  size: number;
  onDelete: (id: string) => void;
}

export const PopulationCard: React.FC<PopulationProps> = ({ 
  name, 
  size, 
  onDelete 
}) => {
  // Component implementation
};
```

### Testing Requirements

- Backend: Minimum 80% code coverage
- Frontend: Test critical user paths
- Include unit and integration tests
- Test error handling and edge cases

### Documentation

- Update README for new features
- Add JSDoc/docstrings for public APIs
- Include examples for complex features
- Update API documentation

## Development Setup

### Prerequisites
- Python 3.9+
- Node.js 16+
- Docker and Docker Compose
- Git

### Local Development

1. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # or `venv\Scripts\activate` on Windows
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   uvicorn app.main:app --reload --port 8001
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Database Setup**
   ```bash
   docker run -d -p 5432:5432 \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=synthea_studio \
     postgres:14
   
   cd backend
   alembic upgrade head
   ```

## Review Process

1. **Automated checks** - CI/CD runs tests and linting
2. **Code review** - Maintainer reviews code quality and design
3. **Testing** - Manual testing for UI/UX changes
4. **Feedback** - Address review comments
5. **Merge** - Squash and merge to develop

## Release Process

- Features merged to `develop` throughout the cycle
- Release branches created from `develop`
- After testing, merged to `main` and tagged
- Semantic versioning (MAJOR.MINOR.PATCH)

## Questions?

- Open a [discussion](https://github.com/synthea-studio/synthea-studio/discussions)
- Join our community chat (coming soon)
- Email: synthea-studio@googlegroups.com (coming soon)

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.