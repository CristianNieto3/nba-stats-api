# Build stage: compile the jar with a full JDK and Maven.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Resolve dependencies first so this layer is cached across source-only changes.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
# Tests run in CI and locally against H2; skipping here keeps deploys fast and
# stops a flaky test from blocking a release.
RUN mvn -B -DskipTests package

# Runtime stage: JRE only, no build tooling in the shipped image.
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Run as a non-root user.
RUN addgroup -S spring && adduser -S spring -G spring
COPY --from=build /build/target/*.jar app.jar
USER spring

# The platform assigns the port at runtime; application.properties reads $PORT.
EXPOSE 8080

# Free tiers are memory-constrained, so size the heap from the container limit
# rather than the JVM's default fraction of host memory.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
