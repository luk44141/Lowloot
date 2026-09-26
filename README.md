\# Lowloot



Lowloot es una plataforma de distribución y gestión de videojuegos desarrollada como proyecto escolar. El proyecto combina un launcher de escritorio con un backend conectado a una base de datos para gestionar usuarios, juegos, compras, biblioteca y funciones sociales.



\## Tecnologías



\- Java

\- Spring Boot

\- PostgreSQL

\- Flyway

\- JWT

\- HTML

\- CSS

\- JavaScript

\- Electron



\## Funcionalidades



Lowloot cuenta actualmente con:



\- Registro e inicio de sesión de usuarios.

\- Autenticación mediante JWT.

\- Sistema de saldo por usuario.

\- Tienda con catálogo de juegos y precios.

\- Carrito de compras.

\- Compra de juegos y registro de transacciones.

\- Biblioteca personal con los juegos adquiridos.

\- Wishlist para guardar juegos.

\- Perfil de usuario con nombre de usuario, nombre visible y avatar.

\- Estadísticas de actividad del usuario.

\- Panel de administración para gestionar usuarios y bibliotecas.

\- Sistema de amigos mediante códigos únicos.

\- Búsqueda de usuarios.

\- Solicitudes de amistad.

\- Lista de amigos y estado de actividad.

\- Perfiles públicos de amigos.

\- Sistema de notificaciones persistentes.

\- Juegos y recursos almacenados localmente.

\- Launcher de escritorio desarrollado con Electron.



\## Estructura del proyecto



\### `lowloot-launcher`



Contiene la aplicación de escritorio de Lowloot. Incluye la interfaz gráfica, navegación, tienda, biblioteca, perfiles, amigos, notificaciones y las demás funciones del launcher.



\### `lowloot-server`



Contiene el backend desarrollado con Spring Boot. Se encarga de la API, autenticación, usuarios, juegos, compras, biblioteca, perfiles, amigos, notificaciones y comunicación con PostgreSQL.



\### `lowlootgames`



Contiene los archivos locales relacionados con los juegos y sus recursos.



\### `lowloot.bat`



Es el launcher principal del proyecto en Windows. Se encarga de iniciar los servicios necesarios para ejecutar Lowloot, incluyendo PostgreSQL, Spring Boot y Electron, y de detener los procesos correspondientes al cerrar la aplicación.



\## Base de datos



Lowloot utiliza PostgreSQL para almacenar la información del sistema.



Las modificaciones de la estructura de la base de datos se gestionan mediante Flyway, permitiendo aplicar las migraciones de forma controlada.



Entre los datos almacenados se encuentran usuarios, juegos, compras, bibliotecas, perfiles, wishlist, solicitudes de amistad, amistades y notificaciones.



\## Ejecución



Para ejecutar Lowloot en Windows se debe contar con las dependencias necesarias instaladas y configuradas, principalmente Java, Maven, PostgreSQL y Node.js.



Una vez configurado el entorno, se puede iniciar el proyecto mediante:



`lowloot.bat`



El archivo se encarga de iniciar los componentes necesarios y abrir el launcher de Electron.



\## Proyecto



Lowloot fue desarrollado como proyecto escolar con fines educativos y no tiene finalidad comercial.

