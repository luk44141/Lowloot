package com.lowloot.server;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class AssetConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Antes esto era una ruta absoluta hardcodeada
        // ("C:\Users\lucam\Desktop\lowloot\lowlootgames"), lo que rompia el
        // proyecto en cualquier otra PC o carpeta. lowloot.bat siempre
        // arranca Spring Boot con el working directory en "lowloot-server",
        // asi que resolvemos "lowlootgames" de forma relativa a eso, sin
        // depender del usuario ni de la ubicacion del proyecto.
        Path assetsPath = Path.of("").toAbsolutePath()
                .resolve("../lowlootgames")
                .normalize();

        registry.addResourceHandler("/assets/**")
                .addResourceLocations(assetsPath.toUri().toString());
    }
}