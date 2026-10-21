<?php

use App\Http\Controllers\BlogController;
use Illuminate\Support\Facades\Route;
use App\Models\Post;
use Illuminate\Support\Facades\Response;

Route::get('blog', [BlogController::class, 'index'])->name('blog.index');
Route::get('blog/category/{category}', [BlogController::class, 'category'])->name('blog.category');
Route::get('blog/{post}', [BlogController::class, 'show'])->name('blog.show');
Route::get('sitemap.xml', function () {
    $posts = Post::published()->latest('published_at')->get(['slug', 'updated_at']);
    $pages = App\Models\Page::published()->where('noindex', false)->get(['slug', 'updated_at']);

    return Response::view('sitemap', compact('posts', 'pages'))
        ->header('Content-Type', 'text/xml');
});
