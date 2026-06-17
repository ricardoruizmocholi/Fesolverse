<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Stripe\Exception\ApiErrorException;
use Stripe\PaymentIntent;
use Stripe\Stripe;

/**
 * Controlador de pagos con Stripe (Fase 7).
 *
 * Qué hace: permite a un usuario autenticado pagar 9,99€ (pago único) para
 * actualizar su plan de "free" a "pro", usando Stripe Payment Intents.
 *
 * Por qué existe: centraliza toda la integración con Stripe. El estado real
 * de cada pago se verifica siempre consultando a Stripe directamente (nunca
 * confiando solo en lo que indique el frontend).
 *
 * Todas las respuestas siguen la estructura:
 * { success: bool, data: {...}, message: string }
 */
class PaymentController extends Controller
{
    /**
     * Importe del pago único para pasar a plan "pro", en céntimos de euro.
     */
    private const IMPORTE_PRO_CENTIMOS = 999;

    /**
     * Crea una sesión de pago (PaymentIntent) para actualizar a plan "pro".
     *
     * Qué hace: comprueba que el usuario autenticado no tenga ya el plan
     * "pro", crea un PaymentIntent en Stripe por 9,99€ y guarda un registro
     * en "payments" con estado "pending".
     *
     * Por qué existe: es el primer paso del flujo de pago desde el
     * componente UpgradePlan del frontend, que usa el "client_secret"
     * devuelto para mostrar el formulario de tarjeta de Stripe.
     *
     * Recibe: Request autenticado (middleware auth:sanctum).
     * Devuelve: JSON con "client_secret" y "publishable_key" (200), 422 si
     * el usuario ya tiene plan "pro", o 502 si Stripe falla.
     */
    public function createCheckoutSession(Request $request)
    {
        $usuario = $request->user();

        if ($usuario->plan === 'pro') {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'Ya tienes el plan Pro.',
            ], 422);
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        try {
            // Limitamos los métodos de pago a tarjeta para poder confirmar el
            // pago en el frontend con stripe.confirmCardPayment() (CardElement),
            // sin necesidad de manejar redirecciones (return_url).
            $paymentIntent = PaymentIntent::create([
                'amount' => self::IMPORTE_PRO_CENTIMOS,
                'currency' => 'eur',
                'payment_method_types' => ['card'],
                'metadata' => [
                    'user_id' => $usuario->id,
                ],
            ]);
        } catch (ApiErrorException $e) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'No se ha podido iniciar el pago: ' . $e->getMessage(),
            ], 502);
        }

        $payment = Payment::create([
            'user_id' => $usuario->id,
            'stripe_payment_intent_id' => $paymentIntent->id,
            'amount' => self::IMPORTE_PRO_CENTIMOS,
            'currency' => 'eur',
            'estado' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'client_secret' => $paymentIntent->client_secret,
                'publishable_key' => config('services.stripe.publishable'),
                'payment' => $payment,
            ],
            'message' => 'Sesión de pago creada correctamente.',
        ]);
    }

    /**
     * Confirma el resultado de un pago y, si ha tenido éxito, actualiza el
     * plan del usuario a "pro".
     *
     * Qué hace: recibe el "payment_intent_id" del pago confirmado en el
     * frontend con Stripe.js, busca el registro "payments" correspondiente
     * al usuario autenticado, y consulta el PaymentIntent directamente en
     * Stripe para comprobar su estado real. Si es "succeeded", marca el
     * pago como "completed" y el usuario pasa a plan "pro"; en cualquier
     * otro caso, marca el pago como "failed".
     *
     * Por qué existe: es el segundo paso del flujo de pago. El backend no
     * confía en que el frontend diga "el pago ha ido bien": lo verifica
     * siempre contra Stripe.
     *
     * Recibe: Request autenticado con "payment_intent_id" (string).
     * Devuelve: JSON con el pago y el usuario actualizados (200) si el pago
     * se ha completado; 422 si los datos no son válidos o el pago no se ha
     * completado; 404 si el pago no existe o no es del usuario; 502 si
     * Stripe falla.
     */
    public function confirmPayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'payment_intent_id' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'data' => $validator->errors(),
                'message' => 'Los datos enviados no son válidos.',
            ], 422);
        }

        $usuario = $request->user();
        $paymentIntentId = $request->input('payment_intent_id');

        $payment = Payment::where('stripe_payment_intent_id', $paymentIntentId)
            ->where('user_id', $usuario->id)
            ->first();

        if (!$payment) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'No se ha encontrado el pago indicado.',
            ], 404);
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        try {
            $paymentIntent = PaymentIntent::retrieve($paymentIntentId);
        } catch (ApiErrorException $e) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'No se ha podido verificar el pago: ' . $e->getMessage(),
            ], 502);
        }

        if ($paymentIntent->status === 'succeeded') {
            $payment->update(['estado' => 'completed']);
            $usuario->update(['plan' => 'pro']);

            return response()->json([
                'success' => true,
                'data' => [
                    'payment' => $payment,
                    'user' => $usuario,
                ],
                'message' => '¡Bienvenido al plan Pro! Ya tienes rutas ilimitadas.',
            ]);
        }

        $payment->update(['estado' => 'failed']);

        return response()->json([
            'success' => false,
            'data' => [
                'payment' => $payment,
            ],
            'message' => 'El pago no se ha completado (estado: ' . $paymentIntent->status . ').',
        ], 422);
    }

    /**
     * Historial de pagos del usuario autenticado.
     *
     * Qué hace: devuelve todos los pagos del usuario, de más reciente a más
     * antiguo.
     *
     * Por qué existe: alimenta el componente PaymentHistory del frontend,
     * que se muestra a los usuarios con plan "pro".
     *
     * Recibe: Request autenticado (middleware auth:sanctum).
     * Devuelve: JSON con el listado de pagos (200).
     */
    public function history(Request $request)
    {
        $pagos = $request->user()->payments()->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => [
                'payments' => $pagos,
            ],
            'message' => 'Historial de pagos obtenido correctamente.',
        ]);
    }
}
