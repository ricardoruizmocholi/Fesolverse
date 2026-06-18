<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;

/**
 * Controlador de autenticación.
 *
 * Qué hace: gestiona el registro, login, logout y obtención del usuario
 * autenticado, además de la verificación de email mediante el enlace
 * firmado que genera Laravel. Por qué existe: centraliza toda la lógica
 * de autenticación de la API (Sanctum) en un único controlador, siguiendo
 * el mismo patrón que ProjectController.
 *
 * Todas las respuestas siguen la estructura:
 * { success: bool, data: {...}, message: string }
 */
class AuthController extends Controller
{
    /**
     * Registra un nuevo usuario en el sistema.
     *
     * Qué hace: valida los datos recibidos, crea el usuario con el plan
     * "free" y guarda la IP desde la que se ha registrado, dispara el envío
     * del email de verificación y genera un token Sanctum para que el
     * frontend pueda autenticar las siguientes peticiones.
     *
     * Por qué existe: es el punto de entrada para que un visitante se
     * convierta en usuario registrado.
     *
     * Recibe: Request con "name", "email", "password" y "password_confirmation".
     * Devuelve: JSON con el usuario creado y el token (201) o los errores
     * de validación (422).
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'data' => $validator->errors(),
                'message' => 'Los datos enviados no son válidos.',
            ], 422);
        }

        $usuario = User::create([
            'name' => $request->input('name'),
            'email' => $request->input('email'),
            'password' => Hash::make($request->input('password')),
            'ip_registro' => $request->ip(),
            'tokens_usados' => 0,
            'plan' => 'free',
        ]);

        // Enviamos la notificación de verificación de email (con MAIL_MAILER=log
        // en local, el correo se escribe en storage/logs/laravel.log).
        $usuario->sendEmailVerificationNotification();

        $token = $usuario->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $usuario,
                'token' => $token,
            ],
            'message' => 'Usuario registrado correctamente. Revisa tu email para verificar la cuenta.',
        ], 201);
    }

    /**
     * Inicia sesión con email y contraseña.
     *
     * Qué hace: valida las credenciales recibidas y, si son correctas,
     * genera un nuevo token Sanctum para el usuario. Si son incorrectas
     * devuelve un 401 (que el middleware "login.throttle" usa para
     * contabilizar los intentos fallidos por IP).
     *
     * Por qué existe: es el punto de entrada para que un usuario ya
     * registrado obtenga un token de acceso a la API.
     *
     * Recibe: Request con "email" y "password".
     * Devuelve: JSON con el usuario y el token (200), errores de validación
     * (422) o credenciales incorrectas (401).
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'data' => $validator->errors(),
                'message' => 'Los datos enviados no son válidos.',
            ], 422);
        }

        $usuario = User::where('email', $request->input('email'))->first();

        if (! $usuario || ! Hash::check($request->input('password'), $usuario->password)) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'Las credenciales no son correctas.',
            ], 401);
        }

        $token = $usuario->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $usuario,
                'token' => $token,
            ],
            'message' => 'Sesión iniciada correctamente.',
        ]);
    }

    /**
     * Cierra la sesión del usuario autenticado.
     *
     * Qué hace: elimina el token Sanctum que se ha usado para autenticar
     * la petición actual, de forma que deje de ser válido.
     *
     * Por qué existe: permite al frontend "desconectar" al usuario de
     * forma segura en el servidor, no solo borrando el token en el cliente.
     *
     * Recibe: Request autenticado (middleware auth:sanctum).
     * Devuelve: JSON confirmando el cierre de sesión (200).
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }

    /**
     * Devuelve los datos del usuario autenticado.
     *
     * Qué hace: expone la información del usuario asociado al token que
     * acompaña la petición.
     *
     * Por qué existe: el frontend lo usa para comprobar si el token
     * almacenado sigue siendo válido y para mostrar los datos del usuario
     * (por ejemplo en el Dashboard).
     *
     * Recibe: Request autenticado (middleware auth:sanctum).
     * Devuelve: JSON con los datos del usuario (200).
     */
    public function me(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'user' => $request->user(),
            ],
            'message' => 'Usuario autenticado obtenido correctamente.',
        ]);
    }

    /**
     * Confirma la verificación del email a través del enlace firmado.
     *
     * Qué hace: comprueba que el "hash" recibido coincide con el del email
     * del usuario y, si es así, marca el email como verificado.
     *
     * Por qué existe: es el endpoint al que apunta el enlace que Laravel
     * incluye en el correo de verificación (ruta "verification.verify").
     *
     * Recibe: id del usuario y hash, vía la URL firmada (middleware "signed").
     * Devuelve: JSON confirmando la verificación (200), o error si el
     * usuario no existe (404) o el hash no es válido (403).
     */
    public function verifyEmail(Request $request, string $id, string $hash)
    {
        $usuario = User::find($id);

        if (! $usuario) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        if (! hash_equals($hash, sha1($usuario->getEmailForVerification()))) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'El enlace de verificación no es válido.',
            ], 403);
        }

        if ($usuario->hasVerifiedEmail()) {
            return response()->json([
                'success' => true,
                'data' => [
                    'user' => $usuario,
                ],
                'message' => 'El email ya estaba verificado.',
            ]);
        }

        $usuario->markEmailAsVerified();

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $usuario,
            ],
            'message' => 'Email verificado correctamente.',
        ]);
    }

    /**
     * Reenvía el email de verificación al usuario autenticado.
     *
     * Qué hace: si el usuario aún no ha verificado su email, le envía de
     * nuevo la notificación con el enlace de verificación.
     *
     * Por qué existe: permite al usuario solicitar un nuevo enlace si el
     * primero ha caducado o no le ha llegado.
     *
     * Recibe: Request autenticado (middleware auth:sanctum).
     * Devuelve: JSON confirmando el envío (200).
     */
    public function resendVerification(Request $request)
    {
        $usuario = $request->user();

        if ($usuario->hasVerifiedEmail()) {
            return response()->json([
                'success' => true,
                'data' => [],
                'message' => 'El email ya estaba verificado.',
            ]);
        }

        $usuario->sendEmailVerificationNotification();

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => 'Se ha reenviado el correo de verificación.',
        ]);
    }

    /**
     * Actualiza el nombre y/o email del usuario autenticado.
     *
     * Qué hace: valida y actualiza los campos "name" y "email". Si el email
     * cambia, resetea email_verified_at a null y envía un nuevo correo de
     * verificación al nuevo email.
     *
     * Recibe: Request con "name" y "email".
     * Devuelve: JSON con el usuario actualizado (200) o errores de
     * validación (422). Si el email cambió, incluye "email_cambiado: true".
     */
    public function updateProfile(Request $request)
    {
        $usuario = $request->user();

        $validator = Validator::make($request->all(), [
            'name'  => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $usuario->id],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'data' => $validator->errors(),
                'message' => 'Los datos enviados no son válidos.',
            ], 422);
        }

        $emailCambiado = $usuario->email !== $request->input('email');

        $usuario->update([
            'name'  => $request->input('name'),
            'email' => $request->input('email'),
        ]);

        if ($emailCambiado) {
            $usuario->email_verified_at = null;
            $usuario->save();
            $usuario->sendEmailVerificationNotification();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $usuario,
                'email_cambiado' => $emailCambiado,
            ],
            'message' => $emailCambiado
                ? 'Perfil actualizado. Deberás verificar tu nuevo email.'
                : 'Perfil actualizado correctamente.',
        ]);
    }

    /**
     * Cambia la contraseña del usuario autenticado.
     *
     * Qué hace: verifica que la contraseña actual sea correcta y, si lo es,
     * la reemplaza por la nueva.
     *
     * Recibe: Request con "current_password", "new_password" y
     * "new_password_confirmation".
     * Devuelve: JSON de éxito (200) o errores de validación (422).
     */
    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'current_password' => ['required', 'string'],
            'new_password'     => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'data' => $validator->errors(),
                'message' => 'Los datos enviados no son válidos.',
            ], 422);
        }

        $usuario = $request->user();

        if (! Hash::check($request->input('current_password'), $usuario->password)) {
            return response()->json([
                'success' => false,
                'data' => ['current_password' => ['La contraseña actual no es correcta.']],
                'message' => 'La contraseña actual no es correcta.',
            ], 422);
        }

        $usuario->update([
            'password' => Hash::make($request->input('new_password')),
        ]);

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => 'Contraseña actualizada correctamente.',
        ]);
    }

    /**
     * Envía un email de recuperación de contraseña.
     *
     * Qué hace: recibe un email y, si existe en la base de datos, le envía
     * un enlace de reset. Si no existe, devuelve el mismo mensaje de éxito
     * por seguridad (no revelamos si el email está registrado o no).
     *
     * En desarrollo (MAIL_MAILER=log), el email con el token se escribe en
     * storage/logs/laravel.log.
     *
     * Recibe: Request con "email".
     * Devuelve: JSON de éxito (200) o error de validación (422).
     */
    public function forgotPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'data' => $validator->errors(),
                'message' => 'Los datos enviados no son válidos.',
            ], 422);
        }

        Password::sendResetLink(['email' => $request->input('email')]);

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => 'Si ese email está registrado, recibirás un enlace de recuperación.',
        ]);
    }

    /**
     * Restablece la contraseña usando el token del email de recuperación.
     *
     * Qué hace: verifica el token recibido y, si es válido, actualiza la
     * contraseña del usuario.
     *
     * Recibe: Request con "token", "email", "password" y
     * "password_confirmation".
     * Devuelve: JSON de éxito (200) o error si el token es inválido/
     * expirado (422).
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token'    => ['required'],
            'email'    => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'data' => $validator->errors(),
                'message' => 'Los datos enviados no son válidos.',
            ], 422);
        }

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'success' => true,
                'data' => [],
                'message' => 'Contraseña actualizada correctamente.',
            ]);
        }

        return response()->json([
            'success' => false,
            'data' => [],
            'message' => 'El enlace de recuperación no es válido o ha expirado.',
        ], 422);
    }
}
