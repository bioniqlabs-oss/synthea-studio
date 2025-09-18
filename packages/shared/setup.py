from setuptools import setup, find_packages

setup(
    name="synthea-studio-shared",
    version="0.1.0",
    description="Shared models and utilities for Synthea Studio services",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "sqlalchemy>=2.0.23",
        "pydantic>=2.5.0",
        "psycopg2-binary>=2.9.9",
        "redis>=5.0.1",
        "alembic>=1.12.1",
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.21.0",
            "pytest-cov>=4.1.0",
            "black>=23.0.0",
            "mypy>=1.4.0",
        ]
    },
)