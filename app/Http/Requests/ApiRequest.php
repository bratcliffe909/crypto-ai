<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ApiRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Since we're using CSRF protection
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'vs_currency' => 'sometimes|required|string|size:3',
            'days' => 'sometimes|required|integer|min:1|max:365',
            'limit' => 'sometimes|required|integer|min:1|max:250',
            'page' => 'sometimes|required|integer|min:1',
            'query' => 'sometimes|required|string|max:100',
            'symbol' => 'sometimes|required|string|max:10',
            'timeframe' => 'sometimes|required|string|in:24h,7d,30d,90d,1y',
        ];
    }

    /**
     * Get custom error messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            '*.required' => 'The :attribute field is required.',
            '*.integer' => 'The :attribute must be a number.',
            '*.string' => 'The :attribute must be text.',
            '*.max' => 'The :attribute is too long.',
            '*.min' => 'The :attribute is too small.',
            '*.in' => 'The selected :attribute is invalid.',
        ];
    }
}
