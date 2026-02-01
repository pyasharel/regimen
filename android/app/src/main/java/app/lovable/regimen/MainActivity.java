package app.lovable.regimen;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom plugins before super.onCreate
        registerPlugin(InAppReviewPlugin.class);
        
        super.onCreate(savedInstanceState);
    }
}
