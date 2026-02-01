package app.lovable.regimen;

import android.app.Activity;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;
import com.google.android.play.core.tasks.Task;

@CapacitorPlugin(name = "InAppReview")
public class InAppReviewPlugin extends Plugin {
    private static final String TAG = "InAppReviewPlugin";

    @Override
    public void load() {
        Log.i(TAG, "InAppReviewPlugin loaded successfully");
    }

    @PluginMethod
    public void requestReview(PluginCall call) {
        Log.i(TAG, "requestReview called");
        
        Activity activity = getActivity();
        if (activity == null) {
            Log.e(TAG, "Activity is null");
            call.reject("Activity not available");
            return;
        }

        ReviewManager reviewManager = ReviewManagerFactory.create(activity);
        Task<ReviewInfo> request = reviewManager.requestReviewFlow();

        request.addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                ReviewInfo reviewInfo = task.getResult();
                Log.i(TAG, "ReviewInfo obtained, launching review flow");
                
                Task<Void> flow = reviewManager.launchReviewFlow(activity, reviewInfo);
                flow.addOnCompleteListener(flowTask -> {
                    // The flow has finished. The API does not indicate whether the user
                    // reviewed or not, or even whether the review dialog was shown.
                    Log.i(TAG, "Review flow completed");
                    call.resolve();
                });
            } else {
                Log.e(TAG, "Failed to get ReviewInfo: " + task.getException());
                // Don't reject - just resolve to avoid blocking the UI
                // The review API can fail for various reasons (not downloaded from Play Store, etc.)
                call.resolve();
            }
        });
    }
}
