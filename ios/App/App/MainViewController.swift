import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginType(InAppReviewPlugin.self)
        print("MainViewController capacitorDidLoad - registered InAppReviewPlugin")
    }
}
